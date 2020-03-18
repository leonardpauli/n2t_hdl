import * as monaco from "monaco-editor";
import {language} from './hdl_lang';
import { object_entries } from "./utils";


export const welcome_text = `
/**
 // Created by Leonard Pauli, mar 2020
 // datasys (KTH course EP1200)
 // see datasys.now.sh and nand2tetris.org


 Welcome to this primitive HDL (Hardware Descriptive Language) editor!

 Some example chips are included, try writing "example"
  + hitting enter in the bottom of this file.

*/

// Under here!




`


export const example_chip_3_port_subscripting = `
/*
  Imagine you have 4 different assignments
    (could be described binary with 2 bits (4=2^2))
  and each assignent have 8 different possible answers
    (could be described binary with 3 bits (8=2^3))
  Now, you want to make a chip that checks the answer,
    given the assignment number and answer guess.
*/
CHIP answer_checker {  
  // We could then group 2 ports together and call them the "assignment channel".
  //   + 3 ports together and call them the "answer channel".
  IN assignment[2], answer[3];

  // The output is just 1 bit (true/false, ie. correct or not)
  OUT correct;

  PARTS:
  // To get the first bit of the 2 assignent bits, we write assignent[0]
  Nand(a=assignent[0], b=assignent[1], out=some_port);
  // we can't write assignent[2] here, as that would be the 3rd bit, and we only got 2 (ie. 0, 1)

  // some chips has channels as inputs, if they're the same size,
  // then we can skip the [] part, but otherwise, we have to specify
  // what parts of the channel we want to connect
  FunChip(input_channel[0..1]=assignent); // same as...
  FunChip(input_channel[0..1]=assignent[0..1]); // same as...
  FunChip(input_channel[0]=assignent[0], input_channel[1]=assignent[1]);
  
  // You may connect multiple ports together
  OtherChip(in[0]=answer[1..2], in[1..2]=answer[0..1], in[3..5]=answer);

  // To really create this answer_checker chip,
  // some muxes and other block would be helpful,
  // create them first! :)
  MagicLogic(out=correct);
}`


const example_chip_1 = `
CHIP example_chip_1 { // imagine the chip as a "black box" with inputs and outputs
IN my_a, my_b; // two signals goes in
OUT my_output; // in this case, one signal goes out (but you could list multiple if you wanted to)

PARTS:
// connect my_a to the port called "a" on a chip called "Nand", etc
// Also create an internal cable/connection called "my_nanded_output",
//  such that we may connect the two internal chips (Nand and Not) together
Nand(a=my_a, b=my_b, out=my_nanded_output);
// lastly, connect the internal Not chip's output to the "outside" / our output
Not(in=my_nanded_output, out=my_output);
}
`

const example_chip_2_nand_wrapper = `
// The nand chip is our fundamental building block
// In hardware, it's created using transistors, look it up :)
CHIP my_nand {
IN a, b;
OUT out;

PARTS:
// Possibly a bit silly, the only thing we've accomplished
// is creating hiding the real Nand chip in another one with
// our name ("my_nand")
// We pass all signals that come to us (a, b) to the real Nand,
// and then send the result out.
Nand(a=a, b=b, out=out);
}
`

export const lang_id = 'hdl'
monaco.languages.register({ id: lang_id });
monaco.languages.setMonarchTokensProvider(lang_id, language)
monaco.languages.registerCompletionItemProvider(lang_id, {
  provideCompletionItems: (
    model: monaco.editor.ITextModel,
    position: monaco.Position,
    context: monaco.languages.CompletionContext,
    token: monaco.CancellationToken,
  ): monaco.languages.ProviderResult<monaco.languages.CompletionList>=> {
    const suggestions: monaco.languages.CompletionItem[] = [{
      label: 'chip',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: [
        'CHIP ${1:name} {',
        '\tIN ${2:inputs};',
        '\tOUT ${3:outputs};',
        '',
        '\tPARTS:',
        '\t$0',
        '}',
      ].join('\n'),
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Custom chip definition',
      range: null as monaco.IRange,
    }, {
      label: 'nand',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: 'Nand(a=${1:a}, b=${2:a}, out=${3:out});',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Nand, "not and":\n00 -> 1\n01 -> 1\n10 -> 1\n11 -> 0',
      range: null as monaco.IRange,
    }, {
      label: 'part',
      kind: monaco.languages.CompletionItemKind.Snippet,
      insertText: '${1:Part}(${2:in}=${3:my_in}, ${4:out}=${5:my_out});',
      insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Use a part',
      range: null as monaco.IRange,
    }, {
      label: '0to9',
      kind: monaco.languages.CompletionItemKind.Snippet,
			insertText: Array(10).fill(null).map((_, i)=> `\${1:before}${i}\${2:after}`).join('\n'),
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Enumerate the numbers',
      range: null as monaco.IRange,
		}, {
      label: '0to15',
      kind: monaco.languages.CompletionItemKind.Snippet,
			insertText: Array(16).fill(null).map((_, i)=> `\${1:before}${i}\${2:after}`).join('\n'),
			insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
      documentation: 'Enumerate the numbers',
      range: null as monaco.IRange,
		}, ...object_entries({
			welcome_text,
			example_chip_3_port_subscripting,
			example_chip_1,
			example_chip_2_nand_wrapper,
		}).map(([k, v])=> ({
      label: k,
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: v,
      range: null as monaco.IRange,
		})),
		]
    return {suggestions}
  }
})

export const theme_id = lang_id+'-theme'
monaco.editor.defineTheme(theme_id, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'delimiter.bracket', foreground: 'AAAAAA' }, // fontStyle: bold
    { token: 'operator.equal', foreground: '89DDFF' },
    { token: 'class', foreground: 'FFCB6B' },
    { token: 'delimiter.parenthesis', foreground: '89DDFF' },
    { token: 'delimiter.separator', foreground: 'AAAAAA' },
    { token: 'keyword', foreground: 'C792EA' },
    { token: 'identifier.own', foreground: 'F07178' },
    { token: 'identifier.other', foreground: 'F0E1A8' },
  ],
  colors: {},
})
