---
title: "Practical use of AbortController with React"
date: 2026-02-26T12:00:00-03:00
lang: "en"
slug: "practical-abortcontroller-with-react"
tags: ["javascript", "react", "performance"]
draft: false
---

So, I was reviewing some devs' code and started noticing that `AbortController` is rarely used, which is honestly a bit odd since it solves a bunch of problems we usually write clunky workarounds for.

So someone's gotta talk about it, right?

## The problem you're probably ignoring

You know that `useEffect` that fires a fetch when the component mounts? Have you ever stopped to think about what happens when the user navigates to another page before the request finishes?

The honest answer is: **it's not pretty**.

The component unmounts, but the request keeps flying through the air. When it finally resolves, React tries to update the state of a component that's already gone. Best case, you get that classic console warning:

```
Warning: Can't perform a React state update on an unmounted component.
```

Worst case, you get some bizarre behavior you spend hours debugging without understanding a thing.

That's where our friend `AbortController` comes in.

## What is it, anyway

`AbortController` is a native browser API (and Node.js since version 15) that lets you cancel async operations. That simple. It's been around since 2017 and I'd bet half of devs have never used it.

The structure is pretty straightforward:

```javascript
const controller = new AbortController();
const signal = controller.signal;

controller.abort();
```

The `signal` is what you pass to whoever needs to know the operation was cancelled. `abort()` is the trigger. When you call `abort()`, the `signal` fires an event and whoever's listening knows it needs to stop what it's doing.

## Works with `fetch`, obviously

`fetch` already accepts `signal` natively:

```javascript
const controller = new AbortController();

fetch('/api/data', { signal: controller.signal })
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => {
    if (err.name === 'AbortError') {
      console.log('request cancelled, all good.');
      return;
    }
    console.error('actual error:', err);
  });

controller.abort();
```

Notice the `err.name === 'AbortError'`. That matters. When you cancel a request, `fetch` rejects the promise with a specific error. You need to handle that case separately from real errors, otherwise you'll end up logging a bunch of stuff that isn't actually an error.

## In useEffect, where the magic happens

Now put all of this together with React and `useEffect`. The cleanup function is the perfect place to call `abort()`:

```javascript
useEffect(() => {
  const controller = new AbortController();

  fetch(`/api/user/${id}`, { signal: controller.signal })
    .then(res => res.json())
    .then(data => setUser(data))
    .catch(err => {
      if (err.name === 'AbortError') return;
      setError(err);
    });

  return () => controller.abort();
}, [id]);
```

What happens here: every time `id` changes, React runs the previous execution's cleanup before running the effect again. So if the user quickly switches profiles, the previous profile's request gets cancelled before the new one starts. No race conditions, no stale state, no console warning.

## Works with event listeners too

Less common, but `AbortController` also works for removing event listeners (oh look at that).

You'd normally do it like this (don't lie to me):

```javascript
function handleKeyDown(e) { /* ... */ }
function handleResize() { /* ... */ }

document.addEventListener('keydown', handleKeyDown);
window.addEventListener('resize', handleResize);

document.removeEventListener('keydown', handleKeyDown);
window.removeEventListener('resize', handleResize);
```

Not terrible. Looks simple, but gets ugly fast when you have listeners scattered everywhere.

What you probably didn't know is that `addEventListener` accepts a third argument. That third argument is `options`, and it can be an object with a `signal` property.

Just like with `fetch`, when `abort()` is called, every listener registered with that signal gets removed automatically:

```javascript
useEffect(() => {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener('scroll', handleScroll, { signal });
  window.addEventListener('resize', handleResize, { signal });
  document.addEventListener('keydown', handleKeyDown, { signal });

  return () => controller.abort(); // beautiful, right?
}, []);
```

Look how simple the cleanup got. One line, bro. There's no way to forget to remove a listener when all you need to do is call one method.

## Real case: search field with debounce

This is a pretty common use case. You've got a search input, you want to fetch results as the user types, but you don't want to fire a request on every keystroke. The classic solution is `debounce`.

The problem is that even with debounce, the user can type fast enough to fire several requests in sequence. And then you hit the classic race condition problem: the second request can resolve before the first, and you end up showing the wrong result.

Without `AbortController`, the solution usually involves a manual flag:

```javascript
// assuming we have debounce implemented, like lodash's
function useSearch(query) {
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (!query) return;

    let cancelled = false;

    const search = debounce(() => {
      fetch(`/api/search?q=${query}`)
        .then(res => res.json())
        .then(data => {
          if (!cancelled) setResults(data);
        });
    }, 300);

    search();

    return () => { cancelled = true; };
  }, [query]);

  return results;
}
```

It works, but it's a hack. The request still goes all the way to the server and back, you're just ignoring the response. Nothing actually got cancelled. And the debounce here isn't even cancelling properly, a new run of the effect doesn't cancel the previous timer because `debounce` gets recreated on every render.

With `AbortController`, you actually cancel it. The `debounce` function now receives the `signal` and passes it along:

```javascript

function useSearch(query) {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) {
      setResults([]);
      return;
    }

    const controller = new AbortController();

    const search = debounce((signal) => {
      setLoading(true);

      fetch(`/api/search?q=${query}`, { signal })
        .then(res => res.json())
        .then(data => {
          setResults(data);
          setLoading(false);
        })
        .catch(err => {
          if (err.name === 'AbortError') return;
          console.error(err);
          setLoading(false);
        });
    }, 300);

    const cancelDebounce = search(controller.signal);

    return () => {
      cancelDebounce();
      controller.abort();
    };
  }, [query]);

  return { results, loading };
}
```

Now, if the user types "microwave" letter by letter, each keystroke cancels the previous debounce. When the debounce finally fires and the request goes to the server, if the user types something else before the response arrives, the request gets truly cancelled. No ghost requests, no race conditions, no wrong result on screen.

Usage looks like this:

```jsx
function Search() {
  const [query, setQuery] = useState('');
  const { results, loading } = useSearch(query);

  return (
    <div>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search..."
      />
      {loading && <span>Loading...</span>}
      <ul>
        {results.map(item => (
          <li key={item.id}>{item.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

Clean, functional, no hacks.

## The detail that trips a lot of people up

When you call `abort()`, any operation that's already finished is unaffected. In other words, if the request already resolved before the component unmounts, `abort()` in the cleanup does nothing. That's correct behavior, not a bug.

The other detail: an aborted `AbortController` can't be "un-aborted". If you need a new operation, create a new controller. That's why in `useEffect` we create a new one on every run of the effect.

## Final disclaimer

Please don't write a useEffect to fetch data, those were ~stupid and dumb~ simple examples. Use `useQuery` from Tanstack Query or `useSWR` from SWR. This was just to illustrate how `AbortController` works.

Later.
