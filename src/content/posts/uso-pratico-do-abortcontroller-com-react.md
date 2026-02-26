---
title: "Uso prático do AbortController com React"
date: 2026-02-26T12:00:00-03:00
slug: "uso-pratico-do-abortcontroller"
tags: ["javascript", "react", "performance"]
draft: false
---

## O problema que você provavelmente ignora

Sabe aquele `useEffect` que faz um fetch quando o componente monta? Você já parou pra pensar o que acontece quando o usuário navega pra outra página antes da requisição terminar?

A resposta honesta é: **não é um moranguinho**.

O componente desmonta, mas a requisição continua voando pelo ar. Quando ela finalmente resolve, o React tenta atualizar o estado de um componente que já foi pro saco. No melhor caso, você vê aquele warning clássico no console:

```
Warning: Can't perform a React state update on an unmounted component.
```

No pior caso, você tem um comportamento bizarro que você passa horas debugando sem entender nada.

É aí que entra o menino `AbortController`.

## O que é isso afinal

O `AbortController` é uma API nativa do browser (e do Node.js desde a versão 15) que te permite cancelar operações assíncronas. Simples assim. Ele existe desde 2017 e eu apostaria que metade dos devs nunca usou.

A estrutura é bem marota:

```javascript
const controller = new AbortController();
const signal = controller.signal;

controller.abort();
```

O `signal` é o que você passa pra quem precisa saber que a operação foi cancelada. O `abort()` é o gatilho. Quando você chama o `abort()`, o `signal` dispara um evento e quem estiver ouvindo sabe que precisa parar o que está fazendo.

## Funciona com o `fetch`, mas é claro

O `fetch` já aceita o `signal` nativamente:

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

Repara no `err.name === 'AbortError'`. Isso é importante. Quando você cancela uma requisição, o `fetch` rejeita a promise com um erro específico. Você precisa tratar esse caso separado dos erros reais, senão vai logar um monte de coisa que não é erro nenhum.

## No useEffect, que é onde a mágica acontece

Agora junta tudo isso com React e o `useEffect`. O cleanup function do `useEffect` é o lugar perfeito pra chamar o `abort()`:

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

O que acontece aqui: toda vez que o `id` muda, o React roda o cleanup da execução anterior antes de rodar o efeito de novo. Então se o usuário mudar de perfil rapidinho, a requisição do perfil anterior é cancelada antes da nova começar. Sem race condition, sem estado desatualizado, sem warning no console.

## Com event listeners também

Menos comum, mas o `AbortController` também funciona pra remover event listeners (ora ora ora, mas veja só).

Você normalmente faria assim (não mente pra mim):

```javascript
function handleKeyDown(e) { /* ... */ }
function handleResize() { /* ... */ }

document.addEventListener('keydown', handleKeyDown);
window.addEventListener('resize', handleResize);

document.removeEventListener('keydown', handleKeyDown);
window.removeEventListener('resize', handleResize);
```

Não é terrivel. Parece simples, mas fica feio rápido quando você tem vários listeners espalhados.

O que provavelmente não sabia era que o `addEventListener` aceita um terceiro argumento. Esse terceiro argumento é o `options` e pode ser um objeto com uma propriedade `signal`.

Assim como no `fetch`, quando o `abort()` é chamado, todos os listeners registrados com aquele signal são removidos automaticamente:

```javascript
useEffect(() => {
  const controller = new AbortController();
  const { signal } = controller;

  window.addEventListener('scroll', handleScroll, { signal });
  window.addEventListener('resize', handleResize, { signal });
  document.addEventListener('keydown', handleKeyDown, { signal });

  return () => controller.abort(); // lindo né?
}, []);
```

Olha como o cleanup ficou simples. Uma linha bro. Não tem como esquecer de remover um listener se você só precisa chamar um método.

## Caso real: campo de busca com debounce

Esse é um exemplo de uso que é bem comum. Você tem um input de pesquisa, quer buscar resultados enquanto o usuário digita, mas não quer disparar uma request a cada tecla pressionada. A solução clássica é `debounce`.

O problema é que mesmo com debounce, o usuário pode digitar rápido o suficiente pra disparar várias requests em sequência. E aí você cai no problema clássico de race condition: a segunda request pode resolver antes da primeira, e você exibe o resultado errado.

Sem `AbortController`, a solução geralmente envolve uma flag manual:

```javascript
// supondo que temos um debounce implementado, tipo do lodash
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

Funciona, mas é uma gambi. A requisição ainda vai até o servidor e volta, você só ignora a resposta. Não cancelou nada de verdade. E o debounce aqui não está nem cancelando direito, uma nova execução do efeito não cancela o timer da anterior porque o `debounce` é recriado a cada render.

Com `AbortController`, você cancela de verdade. A função `debounce` agora recebe o `signal` e passa pra frente:

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

Agora, se o usuário digitar "microondas" letra por letra, cada keystroke cancela o debounce anterior. Quando o debounce finalmente dispara e a request vai pro servidor, se o usuário digitar mais alguma coisa antes da resposta chegar, a request é cancelada de verdade. Sem requests fantasmas, sem race condition, sem resultado errado na tela.

O uso fica assim:

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

Limpo, funcional, sem gambis.

## O detalhe que pega muita gente

Quando você chama `abort()`, qualquer operação que já terminou não é afetada. Ou seja, se a requisição já resolveu antes do componente desmontar, o `abort()` no cleanup não faz nada. Isso é o comportamento correto, não é bug.

O outro detalhe: um `AbortController` abortado não pode ser "desabortado". Se você precisar de uma nova operação, cria um novo controller. Por isso no `useEffect` a gente cria um novo a cada execução do efeito.

## Disclaimer final

Não escreve useEffect para buscar dados por favor, foram exemplos ~estupidos e idiotas~ simples. Use o `useQuery` do Tanstack Query ou o `useSWR` do SWR. Aqui só é pra ilustrar o uso do `AbortController`.

Inté.
