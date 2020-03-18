import * as monaco from "monaco-editor";
import {language} from './hdl_lang';


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
      label: 'example_chip_1',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText:
`CHIP example_chip_1 { // imagine the chip as a "black box" with inputs and outputs
  IN my_a, my_b; // two signals goes in
  OUT my_output; // in this case, one signal goes out (but you could list multiple if you wanted to)

  PARTS:
  // connect my_a to the port called "a" on a chip called "Nand", etc
  // Also create an internal cable/connection called "my_nanded_output",
  //  such that we may connect the two internal chips (Nand and Not) together
  Nand(a=my_a, b=my_b, out=my_nanded_output);
  // lastly, connect the internal Not chip's output to the "outside" / our output
  Not(in=my_nanded_output, out=my_output);
}`,
      range: null as monaco.IRange,
    }, {
      label: 'example_chip_2_nand_wrapper',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText:
`
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
}`,
      range: null as monaco.IRange,
    }, {
      label: 'example_chip_3_port_subscripting',
      kind: monaco.languages.CompletionItemKind.Text,
      insertText: example_chip_3_port_subscripting,
      range: null as monaco.IRange,
    }]
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
