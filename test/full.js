// testing everything here

import * as babel from 'babel-core'
import cheerio from 'cheerio'
import compiler from '../'
import css from 'css'
import fs from 'fs'
import path from 'path'
import test from 'ava'
import vm from 'vm'

const fixture = fs.readFileSync(path.join(__dirname, 'Fixture.fig')).toString()

const compiled = compiler(fixture)

test('name', t => {
	t.is(typeof compiled.name, 'string')

	t.is(compiled.name, 'super-component')
})

test('template', t => {
	t.is(typeof compiled.template, 'function', 'is a function')

	const locals = { msg: 'hello world' }
	const rendered = compiled.template(locals)
	const $ = cheerio.load(rendered)

	t.is($('h1').text(), 'hello world')
	t.is($('button#thing').text(), 'foo')
	t.is($('label').text(), 'bar')
	t.is($('section.footer').text(), 'bye')
})

test('style', t => {
	t.is(typeof compiled.style, 'string')

	const ast = css.parse(compiled.style)
	const rules = ast.stylesheet.rules

	// h1 { color: red; }
	t.deepEqual(rules[0].selectors, ['h1'])
	t.is(rules[0].declarations[0].property, 'color')
	t.is(rules[0].declarations[0].value, 'red')

	// button { border: 2px dashed black; }
	t.deepEqual(rules[1].selectors, ['button'])
	t.is(rules[1].declarations[0].property, 'border')
	t.is(rules[1].declarations[0].value, '2px dashed black')

	// label, .section { font-size: 0.5em; }
	t.deepEqual(rules[2].selectors, ['label', '.section'])
	t.is(rules[2].declarations[0].property, 'font-size')
	t.is(rules[2].declarations[0].value, '0.5em')

	// exactly 3 rules
	t.is(rules.length, 3)
})

test('script', t => {
	t.is(typeof compiled.script, 'string')

	// it is encouraged to use es6 modules inside script tags,
	// therefore a little touch of babel is required for this test
	const str = babel.transform(compiled.script, {
		plugins: ['transform-es2015-modules-commonjs']
	}).code

	const script = new vm.Script(str)
	const module = {
		exports: {}
	}
	const sandbox = {
		module,
		exports: module.exports
	}
	script.runInContext(vm.createContext(sandbox))

	const fn = sandbox.exports.default
	const view = {}
	fn(view, {}, {})

	t.is(view.msg, 'today is a great day!')
	t.is(typeof view.clicked, 'function')

	// other exports
	t.is(sandbox.exports.foo, 'bar')
	t.is(sandbox.exports.baz, 'loo')
})
