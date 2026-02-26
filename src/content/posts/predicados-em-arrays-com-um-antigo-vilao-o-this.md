---
title: "Predicados de busca em Arrays com um antigo vilão, o `this`"
date: 2022-11-17T23:19:30-03:00
slug: "predicados-em-arrays-com-um-antigo-vilao-o-this"
tags: ["javascript", "performance"]
draft: false
---

*A primeira postagem é especial, então escrevi ouvindo [este álbum maravilhoso](https://open.spotify.com/album/79dL7FLiJFOO0EoehUHQBv?si=xNdnkscPStmVMW-TD2i7-w) do Kevin.*

## Prefácio

É, o `this` é odiado entre quase todos os *devs* do *javascripto*, talvez seja o elemento mais odiado e se você ainda não odeia, ainda vai odiar. A razão é bem conhecida, seu comportamento e valor é meio estranho, assim como todo JS, mas ele em especial pois [depende do contexto que se encontra](https://www.30secondsofcode.org/articles/s/javascript-this), ou seja, do objeto que está em execução naquele momento. Vejamos alguns exemplos:

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

Em um construtor, o `this` se refere ao objeto construído:

```javascript
class MyClass {
  constructor() {
    this.x = 5;
  }
}

const obj = new MyClass();
console.log(obj.x); // 5
```

E finalmente, em um objeto se refere ao próprio:

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

Então, podemos concluir que é uma faca de *dois legumes*, e pega muita gente. Mas capturar referências do objeto em execução muitas vezes pode simplificar coisinhas do cotidiano.

## Arrays feat: arrays

Observe o seguinte bloco código:

```javascript
const movies = [
  { id: 1, name: "Titanic", year: 1997 },
  { id: 2, name: "Bastardos Inglórios", year: 2009 },
  { id: 3, name: "Laranja Mecânica", year: 1971 },
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

Basicamente, uma lista de filmes que eu gosto muito e algumas funções que retorna uma versão filtrada da mesma lista, simples né? É a forma que geralmente implementamos **mas** e o **reuso????**

Podemos reescrever uma das funções fazendo *curring*, assim:

```javascript
function byBeforeYear(year) {
  return function(item){
    item => item.year < year
  }
}
movies.find(byBeforeYear(2000))
```

Digamos que a montagem fica estranha, ainda mais porque confunde a cabecinha uma função retornando outra função, (não é, juninho?).

## Fofoca? Gosto

Talvez você nunca tenha reparado, mas os métodos de Array (map, find, filter,..) possuem um **segundo parâmetro** onde você pode dizer qual o valor do `this` quando chamamos uma função predicado. Ou seja:

```javascript
[].filter(function(){
  this;  // 'foo'
}, 'foo');
```

Hmm.... então podemos escrever coisas assim?

```javascript
movies.filter(function(movie){
  return movie.year > this;
}, 2000)
```

Sim, dá certo. Ouuuu seja, podemos criar predicados mais reaproveitáveis e mais **rápidos**. Assim:

```javascript
function isBefore(movie){
  return movie.year > this;
}

movies.filter(isBefore, 2000)
movies.filter(isBefore, 1990)
```

Não fica lindo? Pois é, só não é mais lindo que você, que tá lendo meu blogzin. Mas não só mais lindo como *mais rápido* em relação a função comum lá no início, se liga nesse *benchmark*:

![Dobrou](/images/screenshot-19-11-2002-0001.png)

Bem melhor, né? Mas calma, só é mais rápido quando o `thisValue` for um **Objeto**, caso contrário o *Javasixpto* precisa converter antes e ai já viu né.

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
// movies with name includes "Laranja"
const c = movies.find(bySearch, { year: "Laranja" });
// movies before 2000
const d = movies.find(byBefore, { year: 2000 });
// movies after 2000
const e = movies.find(byAfter, { year: 2000 });
```

Legal, não é? Só frisando que a discussão aqui não é sobre qual jeito é melhor ou pior, até porque é inútil discutir isso, cabe você *devinho* usar sua criatividade para aplicar isso. Só joguei a ideia no ar.

## Menção honrosa

Durante os benchmarks que fiz descobri o quão rápida é a solução com *curring*, ainda mais rápida que a solução com o `thisValue`. Se liga:

![Result](/images/Screenshot-2022-11-19-at-15.31.13.png)

Isso é tudo pessoal.

