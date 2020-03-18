import * as monaco from "monaco-editor";
import LanguageConfiguration = monaco.languages.LanguageConfiguration;
import IMonarchLanguage = monaco.languages.IMonarchLanguage;

// https://github.com/microsoft/monaco-languages/blob/master/src/cpp/cpp.ts

export const conf: LanguageConfiguration = {
	wordPattern: /(#?-?\d*\.\d\w*%?)|((::|[@#.!:])?[\w-?]+%?)|::|[@#.!:]/g,

	comments: {
		lineComment: '//',
		blockComment: ['/*', '*/']
	},

	brackets: [
		['{', '}'],
		['[', ']'],
		['(', ')']
	],

	autoClosingPairs: [
		{ open: '{', close: '}', notIn: ['string', 'comment'] },
		{ open: '[', close: ']', notIn: ['string', 'comment'] },
		{ open: '(', close: ')', notIn: ['string', 'comment'] },
	],

	surroundingPairs: [
		{ open: '{', close: '}' },
		{ open: '[', close: ']' },
		{ open: '(', close: ')' },
	],

	folding: {
		markers: {
			start: new RegExp("^\\s*\\/\\*\\s*#region\\b\\s*(.*?)\\s*\\*\\/"),
			end: new RegExp("^\\s*\\/\\*\\s*#endregion\\b.*\\*\\/")
		}
	}
};

export const language = <IMonarchLanguage>{
	defaultToken: '',
	tokenPostfix: '.hdl',

	ws: '[ \t\n\r\f]*', // whitespaces (referenced in several rules)
	identifier: /[A-Za-z_][A-Za-z_0-9]*/,
	// identifier: /[A-Za-z_][A-Za-z_0-9]*/,

	brackets: [
		{ open: '{', close: '}', token: 'delimiter.bracket' },
		{ open: '[', close: ']', token: 'delimiter.square' },
		{ open: '(', close: ')', token: 'delimiter.parenthesis' },
	],

	// keywords: ['CHIP', 'IN', 'OUT', 'PARTS'],
	tokenizer: {
		root: [
			{include: '@whitespace'},
			{include: '@chip_def'},
		],

		uint: [
			[/\d+/, 'attribute.value.number'],
		],

		whitespace: [
			[/[ \t\r\n]+/, ''],
			[/\/\*/, 'comment', '@comment'],
			[/\/\/.*$/, 'comment'], // line-comment
		],

		comment: [
			[/[^\/*]+/, 'comment'],
			[/\*\//, 'comment', '@pop'],
			[/[\/*]/, 'comment']
		],




		chip_def: [
			[/CHIP/, 'keyword', '@chip_def_sp'],
		],
		chip_def_sp: [
			{include: '@whitespace'},
			['@identifier', 'class', '@chip_def_sp_cl_sp'],
		],
		chip_def_sp_cl_sp: [
			{include: '@whitespace'},
			[/\{/, 'delimiter.bracket', '@chip_def_body'],
		],

		chip_def_body: [
			{include: '@whitespace'},
			[/\}/, {token: 'delimiter.bracket', switchTo: '@root'}],
			{include: '@section'},
			// { include: '@uint' },
			// [/[{}()\[\]]/, '@brackets'],
			// [/[=]/, 'operator.equal'],
			// [/[;,:]/, 'delimiter.separator'],
			// ['@identifier', 'identifier'],
		],

		section: [
			{include: '@whitespace'},
			[/IN|OUT|PARTS/, 'keyword', '@section_sp'],
			['@identifier', 'identifier', '@section_sp'],
			[/\}/, {token: 'delimiter.bracket', switchTo: '@root'}],
		],

		section_sp: [
			[/[:]/, 'delimiter.separator', '@section_block'],
			{include: '@section_port'},
		],

		section_port: [
			{include: '@whitespace'},
			['@identifier', 'identifier.own', '@section_port_post'],
			[/,/, 'delimiter.separator'],
			[/;|\n/, {token: 'delimiter.separator', switchTo: '@section'}],
		],
		section_port_post: [
			[/\[/, 'delimiter.bracket', '@subscript_single'],
			['', '', '@pop'],
		],
		subscript_single: [
			{include: '@uint'},
			[/\]/, {token: 'delimiter.bracket', switchTo: '@section_port'}],
		],

		section_block: [
			{include: '@whitespace'},
			['@identifier', 'class', '@part'],
			[/;|\n/, {token: 'delimiter.separator', switchTo: '@section_block'}],
			[/\}/, {token: 'delimiter.bracket', switchTo: '@root'}],
		],
		part: [
			[/\(/, 'delimiter.parenthesis', '@part_inside'],
		],
		part_inside: [
			{include: '@part_port'},
			[/\)/, 'delimiter.parenthesis', '@section_block'],
		],


		part_port: [
			{include: '@whitespace'},
			['@identifier', 'identifier.other', '@part_port_post'],
			[/,/, {token: 'delimiter.separator', switchTo: 'part_port'}],
			[/\)/, {token: 'delimiter.parenthesis', switchTo: '@section_block'}],
		],
		part_port2: [
			{include: '@whitespace'},
			['@identifier', 'identifier.own', '@part_port_post_2'],
			[/,/, {token: 'delimiter.separator', switchTo: 'part_port'}],
			[/\)/, {token: 'delimiter.parenthesis', switchTo: '@section_block'}],
		],
		part_port_post_2: [
			[/\[/, 'delimiter.bracket', '@part_port_post_subscript2'],
			[/,/, {token: 'delimiter.separator', switchTo: 'part_port'}],
			[/\)/, {token: 'delimiter.parenthesis', switchTo: '@section_block'}],
		],
		part_port_post_subscript2: [
			{include: '@uint'},
			[/\.\./, 'delimiter'],
			[/\]/, {token: 'delimiter.bracket', switchTo: '@part_port'}],
		],
		

		part_port_post: [
			[/\[/, 'delimiter.bracket', '@part_port_post_subscript'],
			[/[=]/, 'operator.equal', '@part_port_post_then'],
		],
		part_port_post_subscript: [
			{include: '@uint'},
			[/\.\./, 'delimiter'],
			[/\]/, {token: 'delimiter.bracket', switchTo: '@part_port_post'}],
		],
		part_port_post_then: [
			{include: '@uint'},
			{include: '@part_port2'},
			['', '', '@pop'],
		],

	}
};