---
title: "Array search predicates and an old villain, `this`"
date: 2022-11-17T23:19:30-03:00
lang: "en"
slug: "array-predicates-and-an-old-villain-this"
tags: ["javascript", "performance"]
draft: false
---

*The first post is special, so I wrote it while listening to [this wonderful album](https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?si=xNdnkscPStmVMW-TD2i7-w) by Kevin.*

## Preface

Yeah, `this` is hated among pretty much every *javascript dev*, maybe it's the most hated feature there is, and if you don't hate it yet, you will. The reason is well known, its behavior and value are kind of weird, like everything in JS, but this one especially because [it depends on the context it's in](https://www.30secondsofcode.org/articles/s/javascript-this), meaning, on the object executing at that moment. Let's look at a few examples:

```javascript
console.log(this) // window
console.log(this === window) // true

function foo(string = ''){
  console.log(this); // window
  return this === window // true
}

//
const el = document.getElementById('my-el');

el.addEventListener('click', function() {
  console.log(this === el); // true
});
```

In a constructor, `this` refers to the object being constructed:

```javascript
class MyClass {
  constructor() {
    this.x = 5;
  }
}

const obj = new MyClass();
console.log(obj.x); // 5
```

And finally, inside an object it refers to the object itself:

```javascript
const obj = {
  fn: function() {
    return this;
  }
};

const anotherObj = Object.create(obj);
anotherObj.foo = 1;

console.log(anotherObj.fn()); // { foo: 1 }
```

So, we can conclude it's a double-edged sword, and it trips a lot of people up. But capturing a reference to the executing object can often simplify everyday things.

## Arrays feat: arrays

Check out the following code block:

```javascript
const movies = [
  { id: 1, name: "Titanic", year: 1997 },
  { id: 2, name: "Inglourious Basterds", year: 2009 },
  { id: 3, name: "A Clockwork Orange", year: 1971 },
  { id: 4, name: "Soul", year: 2021 },

];

function findByID(id) {
  return movies.find(item => item.id === id);
}

function findByName(name = '') {
  return movies.filter(item => item.name.toLowerCase().includes(name.toLowerCase()));
}

function findBeforeYear(year) {
  return movies.filter(item => item.year < year);
}

function findYear21Century() {
  return movies.find(item => item.year > 2000);
}

```

Basically, a list of movies I really like and some functions that return a filtered version of that same list, simple right? It's how we usually implement this, **but** what about **reuse????**

We can rewrite one of the functions using *currying*, like this:

```javascript
function byBeforeYear(year) {
  return function(item){
    item => item.year < year
  }
}
movies.find(byBeforeYear(2000))
```

Let's say the setup gets a little weird, especially because a function returning another function messes with your head (right, junior?).

## Gossip? I love it

You might've never noticed, but Array methods (map, find, filter,..) have a **second parameter** where you can say what the value of `this` should be when calling a predicate function. In other words:

```javascript
[].filter(function(){
  this;  // 'foo'
}, 'foo');
```

Hmm.... so we can write things like this?

```javascript
movies.filter(function(movie){
  return movie.year > this;
}, 2000)
```

Yes, it works. In other words, we can create more reusable and **faster** predicates. Like this:

```javascript
function isBefore(movie){
  return movie.year > this;
}

movies.filter(isBefore, 2000)
movies.filter(isBefore, 1990)
```

Isn't that nice? Well, it's not as nice as you, reading my little blog. But it's not just nicer, it's also *faster* than the regular function from the beginning, check out this *benchmark*:

![Doubled](/images/screenshot-19-11-2002-0001.png)

Much better, right? But hold on, it's only faster when the `thisValue` is an **Object**, otherwise *Javascript* needs to convert it first, and well, you know how that goes.

```js

function byEquals(movie) {
  const key = Object.keys(this)[0];
  return movie[key] === this[key];
}

function bySearch(movie) {
  const key = Object.keys(this)[0];
  return movie[key].includes(this[key]);
}

function byBefore(movie) {
  const key = Object.keys(this)[0];
  return movie[key] < this[key];
}

function byAfter(movie) {
  const key = Object.keys(this)[0];
  return movie[key] < this[key];
}

// movies made in 2009
const a = movies.find(byEquals, { year: 2009 });
// Movie with id 1
const b = movies.find(byEquals, { id: 1 });
// movies with name includes "Orange"
const c = movies.find(bySearch, { year: "Orange" });
// movies before 2000
const d = movies.find(byBefore, { year: 2000 });
// movies after 2000
const e = movies.find(byAfter, { year: 2000 });
```

Cool, right? Just to be clear, the point here isn't which way is better or worse, honestly it's pointless to argue about that, it's up to you, *dev*, to use your creativity to apply this. I just threw the idea out there.

## Honorable mention

While running these benchmarks I found out how fast the *currying* solution is, even faster than the `thisValue` solution. Check it out:

![Result](/images/Screenshot-2022-11-19-at-15.31.13.png)

That's all folks.
