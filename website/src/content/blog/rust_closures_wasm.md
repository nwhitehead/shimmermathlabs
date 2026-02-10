---
title: 'Rust Closures and WASM'
description: ''
pubDate: 'Dec 30 2025'
draft: true
heroImage: '../../assets/blog-placeholder-2.jpg'
---

One of the promises of Rust is "fearless concurrency". But how does that
translate to the web? WASM on the web works, it's here. You can write `egui`
graphical applications that work on a webpage.

THINGS TO INCLUDE
* Rust closure basics
* Lifetime of closure things
* `Rc` and `Arc`, `RefCell` for mutability
* Normal closure lifetime issues
* `async` Rust
* Turning things into WASM
* Starting `Worklet`
* Setting up SAB
* Rust objects over WASM barrier
* `Promise` and futures
