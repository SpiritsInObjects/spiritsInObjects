'use strict'



//test()

describe('Main', function(){
//some tests that pertain to all animals
   describe('a', function() {
      //some tests in here specific to cats.
   })
   describe('b', function() {
      //some tests in here specific to dogs.
   })
   describe('c', function() {
      //some tests in here specific to snakes.
   })
});

describe('Renderer', function(){
   describe('sonifyNode', function() {
      require('./renderer_sonifyNode');
   });
   describe('b', function() {
      //some tests in here specific to dogs.
   })
   describe('c', function() {
      //some tests in here specific to snakes.
   })
})