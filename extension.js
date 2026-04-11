const vscode = require('vscode');

const MNEMONIC_INFO = {
    HALT: { summary: 'wait for interrupt', forms: ['HALT'] },
    NOP:  { summary: 'no operation', forms: ['NOP'] },
    GET:  { summary: 'dest <- [src]', forms: ['GET reg, [reg]'] },
    PUT:  { summary: '[dest] <- src', forms: ['PUT [reg], reg', 'PUT [reg], imm16'] },
    MOV:  { summary: 'dest <- src', forms: ['MOV reg, reg', 'MOV reg, imm16'] },
    PUSH: { summary: 'push word to the stack', forms: ['PUSH reg', 'PUSH imm16'] },
    POP:  { summary: 'pop word from the stack', forms: ['POP reg'] },
    ADD:  { summary: 'dest <- dest + src', forms: ['ADD reg, reg', 'ADD reg, imm16'] },
    ADC:  { summary: 'dest <- dest + src + carry', forms: ['ADC reg, reg', 'ADC reg, imm16'] },
    SUB:  { summary: 'dest <- dest - src', forms: ['SUB reg, reg', 'SUB reg, imm16'] },
    SBC:  { summary: 'dest <- dest - src - borrow', forms: ['SBC reg, reg', 'SBC reg, imm16'] },
    MUL:  { summary: 'dest <- dest * src', forms: ['MUL reg, reg', 'MUL reg, imm16'] },
    MOD:  { summary: 'dest <- dest % src', forms: ['MOD reg, reg', 'MOD reg, imm16'] },
    DIV:  { summary: 'dest <- dest / src', forms: ['DIV reg, reg', 'DIV reg, imm16'] },
    INC:  { summary: 'dest <- dest + 1', forms: ['INC reg'] },
    DEC:  { summary: 'dest <- dest - 1', forms: ['DEC reg'] },
    LSH:  { summary: 'dest <- dest << src', forms: ['LSH reg, reg', 'LSH reg, imm16'] },
    RSH:  { summary: 'dest <- dest >> src', forms: ['RSH reg, reg', 'RSH reg, imm16'] },
    ASR:  { summary: 'dest <- src >> shift', forms: ['ASR reg, reg', 'ASR reg, imm16'] },
    AND:  { summary: 'dest <- dest & src', forms: ['AND reg, reg', 'AND reg, imm16'] },
    OR:   { summary: 'dest <- dest | src', forms: ['OR reg, reg', 'OR reg, imm16'] },
    NOT:  { summary: 'dest <- ~dest', forms: ['NOT reg'] },
    XOR:  { summary: 'dest <- dest ^ src', forms: ['XOR reg, reg', 'XOR reg, imm16'] },
    SWP:  { summary: 'swap values of two registers', forms: ['SWP reg, reg'] },
    STI:  { summary: 'set interrupt enable flag', forms: ['STI'] },
    CLI:  { summary: 'clear interrupt enable flag', forms: ['CLI'] },
    STC:  { summary: 'set carry flag', forms: ['STC'] },
    CLC:  { summary: 'clear carry flag', forms: ['CLC'] },
    INB:  { summary: 'dest <- port(src)', forms: ['INB reg, reg', 'INB reg, imm16'] },
    OUTB: { summary: 'port(dest) <- src', forms: ['OUTB reg, reg', 'OUTB imm16, reg'] },
    CMP:  { summary: 'non-destructive compare', forms: ['CMP reg, reg', 'CMP reg, imm16'] },
    JMP:  { summary: 'pc <- dest', forms: ['JMP reg', 'JMP imm16'] },
    JZ:   { summary: 'pc <- dest if zero', forms: ['JZ label'] },
    JNZ:  { summary: 'pc <- dest if not zero', forms: ['JNZ label'] },
    JC:   { summary: 'pc <- dest if carry', forms: ['JC label'] },
    JNC:  { summary: 'pc <- dest if not carry', forms: ['JNC label'] },
    JA:   { summary: 'pc <- dest if above', forms: ['JA label'] },
    JAE:  { summary: 'pc <- dest if above or equal', forms: ['JAE label'] },
    JB:   { summary: 'pc <- dest if below', forms: ['JB label'] },
    JBE:  { summary: 'pc <- dest if below or equal', forms: ['JBE label'] },
    JG:   { summary: 'pc <- dest if greater', forms: ['JG label'] },
    JGE:  { summary: 'pc <- dest if greater or equal', forms: ['JGE label'] },
    JL:   { summary: 'pc <- dest if less', forms: ['JL label'] },
    JLE:  { summary: 'pc <- dest if less or equal', forms: ['JLE label'] },
    CALL: { summary: 'call subroutine at dest', forms: ['CALL reg', 'CALL imm16'] },
    RET:  { summary: 'return from subroutine.', forms: ['RET'] },
    INT:  { summary: 'call software interrupt', forms: ['INT reg', 'INT imm16'] },
    IRET: { summary: 'return from interrupt', forms: ['IRET'] },
    BCPY: { summary: 'copy memory block from src to dest with length imm16', forms: ['BCPY reg, reg', 'BCPY reg, imm16'] },
};

const MNEMONICS = Object.keys(MNEMONIC_INFO);

const REGISTERS = [
    'A', 'B', 'C', 'D', 'E', 'X', 'Y', 'Z', 'F', 'PC', 'SP', 'MB'
];

const DIRECTIVE_INFO = {
    DATA: {
        summary: 'Inline data words or strings.',
        forms: ['DATA 0x1111', 'DATA "hello", 0', 'DATA other_label']
    },
    IMPORT: {
        summary: 'Include another JASM source file.',
        forms: ['IMPORT "libs/string.jasm"']
    },
    DEFINE: {
        summary: 'Define a numeric constant.',
        forms: ['DEFINE vram_start 0x1000']
    },
    TIMES: {
        summary: 'Repeat a value for a number of words.',
        forms: ['TIMES 512, 0x0000']
    },
    ALIGN: {
        summary: 'Pad with zeros to an alignment boundary.',
        forms: ['ALIGN 0x200']
    },
    ORG: {
        summary: 'Set the origin for label resolution.',
        forms: ['ORG 0x200']
    }
};

const DIRECTIVES = Object.keys(DIRECTIVE_INFO);

const MACRO_KEYWORDS = ['MACRO', 'END MACRO'];

const REGISTER_DOCS = {
    A: 'General-purpose register.',
    B: 'General-purpose register.',
    C: 'General-purpose register.',
    D: 'General-purpose register.',
    E: 'General-purpose register.',
    X: 'General-purpose register.',
    Y: 'General-purpose register.',
    Z: 'General-purpose register.',
    PC: 'Program counter.',
    SP: 'Stack pointer.',
    MB: 'Memory bank register.',
    F: 'Flags register.'
};

function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSyntaxMarkdown(title, summary, forms) {
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`**${title}**`);
    if (summary) {
        md.appendMarkdown(` - ${summary}`);
    }
    if (forms.length > 0) {
        md.appendMarkdown('\n\n');
        for (const form of forms) {
            md.appendCodeblock(form, 'jasm');
        }
    }
    return md;
}

function buildMnemonicMarkdown(mnemonic) {
    const info = MNEMONIC_INFO[mnemonic];
    return info ? buildSyntaxMarkdown(mnemonic, info.summary, info.forms) : null;
}

function buildDirectiveMarkdown(directive) {
    const info = DIRECTIVE_INFO[directive];
    return info ? buildSyntaxMarkdown(directive, info.summary, info.forms) : null;
}

function activate(context) {
    const definitionProvider = vscode.languages.registerDefinitionProvider('jasm', {
        provideDefinition(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return null;
            }

            const word = document.getText(range);
            const escapedWord = escapeRegExp(word);
            const labelDefRegex = new RegExp(`^\\s*${escapedWord}\\s*:`, 'i');
            const macroDefRegex = new RegExp(`^\\s*MACRO\\s+${escapedWord}\\b`, 'i');

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (labelDefRegex.test(line.text) || macroDefRegex.test(line.text)) {
                    return new vscode.Location(document.uri, line.range);
                }
            }

            return null;
        }
    });

    const hoverProvider = vscode.languages.registerHoverProvider('jasm', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return null;
            }

            const originalWord = document.getText(range);
            const word = originalWord.toUpperCase();

            if (MNEMONIC_INFO[word]) {
                return new vscode.Hover(buildMnemonicMarkdown(word), range);
            }

            if (DIRECTIVE_INFO[word]) {
                return new vscode.Hover(buildDirectiveMarkdown(word), range);
            }

            if (REGISTER_DOCS[word]) {
                return new vscode.Hover(new vscode.MarkdownString(REGISTER_DOCS[word]), range);
            }

            const labelDefRegex = new RegExp(`^\\s*${escapeRegExp(originalWord)}\\s*:`, 'i');
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (labelDefRegex.test(line.text)) {
                    return new vscode.Hover(new vscode.MarkdownString(`Defined on line ${i + 1}.`), range);
                }
            }

            return null;
        }
    });

    const completionProvider = vscode.languages.registerCompletionItemProvider('jasm', {
        provideCompletionItems() {
            const mnemonicItems = MNEMONICS.map((mnemonic) => {
                const item = new vscode.CompletionItem(mnemonic, vscode.CompletionItemKind.Keyword);
                item.detail = 'Instruction';
                item.documentation = buildMnemonicMarkdown(mnemonic);
                return item;
            });

            const registerItems = REGISTERS.map((register) => {
                const item = new vscode.CompletionItem(register, vscode.CompletionItemKind.Variable);
                item.detail = 'Register';
                item.documentation = new vscode.MarkdownString(REGISTER_DOCS[register]);
                return item;
            });

            const directiveItems = DIRECTIVES.map((directive) => {
                const item = new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword);
                item.detail = 'Directive';
                item.documentation = buildDirectiveMarkdown(directive);
                return item;
            });

            const macroItems = MACRO_KEYWORDS.map((keyword) => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                item.detail = 'Macro';
                item.documentation = keyword === 'MACRO'
                    ? buildSyntaxMarkdown('MACRO', 'Define a macro.', ['MACRO name %arg1, %arg2', 'END MACRO'])
                    : new vscode.MarkdownString('**END MACRO**');
                return item;
            });

            const macroArgItem = new vscode.CompletionItem('%', vscode.CompletionItemKind.Snippet);
            macroArgItem.insertText = new vscode.SnippetString('%${1:name}');
            macroArgItem.detail = 'Macro Argument';
            macroArgItem.documentation = new vscode.MarkdownString('`%name`');

            return [
                ...mnemonicItems,
                ...registerItems,
                ...directiveItems,
                ...macroItems,
                macroArgItem
            ];
        }
    });

    context.subscriptions.push(definitionProvider, hoverProvider, completionProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
