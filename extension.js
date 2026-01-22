const vscode = require('vscode');

// Updated mnemonics per EBNF
const MNEMONICS = [
    'GET', 'PUT', 'MOV', 'PUSH', 'POP', 'ADD', 'ADC', 'SUB', 'SBC', 
    'INC', 'DEC', 'LSH', 'RSH', 'AND', 'OR', 'NOR', 'NOT', 'XOR', 'INB', 'OUTB', 
    'CMP', 'JMP', 'JZ', 'JNZ', 'JC', 'JNC', 'CALL', 'RET', 'INT', 'IRET', 'HALT', 'NOP'
];

const REGISTERS = [
    'A', 'B', 'C', 'D', 'E', 'X', 'Y', 'PC', 'SP', 'MB', 'F', 'Z'
];

const DIRECTIVES = [
    'DATA', 'IMPORT'
];

const MACRO_KEYWORDS = [
    'MACRO', 'END MACRO'
];

// Documentation for mnemonics
const MNEMONIC_DOCS = {
    'GET': 'Load data from memory into a register',
    'PUT': 'Store data from a register into memory',
    'MOV': 'Move data between registers',
    'PUSH': 'Push a value onto the stack',
    'POP': 'Pop a value from the stack',
    'ADD': 'Add two values',
    'ADC': 'Add with carry',
    'SUB': 'Subtract two values',
    'SBC': 'Subtract with carry',
    'INC': 'Increment a register',
    'DEC': 'Decrement a register',
    'LSH': 'Logical shift left',
    'RSH': 'Logical shift right',
    'AND': 'Bitwise AND operation',
    'OR': 'Bitwise OR operation',
    'NOR': 'Bitwise NOR operation',
    'NOT': 'Bitwise NOT operation',
    'XOR': 'Bitwise XOR operation',
    'INB': 'Input byte from port',
    'OUTB': 'Output byte to port',
    'CMP': 'Compare two values',
    'JMP': 'Unconditional jump',
    'JZ': 'Jump if zero flag is set',
    'JNZ': 'Jump if zero flag is not set',
    'JC': 'Jump if carry flag is set',
    'JNC': 'Jump if carry flag is not set',
    'CALL': 'Call a subroutine',
    'RET': 'Return from subroutine',
    'INT': 'Software interrupt',
    'IRET': 'Return from interrupt',
    'HALT': 'Halt the processor',
    'NOP': 'No operation'
};

// Documentation for registers
const REGISTER_DOCS = {
    'A': 'General purpose register A',
    'B': 'General purpose register B',
    'C': 'General purpose register C',
    'D': 'General purpose register D',
    'E': 'General purpose register E',
    'X': 'Index register X',
    'Y': 'Index register Y',
    'PC': 'Program Counter - points to the next instruction',
    'SP': 'Stack Pointer - points to the top of the stack',
    'MB': 'Memory Bank register',
    'F': 'Flags register',
    'Z': 'Zero register (always contains 0)'
};

function activate(context) {

    // --- FEATURE 1: GO TO DEFINITION ---
    const definitionProvider = vscode.languages.registerDefinitionProvider('jasm', {
        provideDefinition(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            if (!word) return null;

            // Look for "LABEL:" at the start of a line
            const labelDefRegex = new RegExp(`^\\s*${word}\\s*:`, 'i');

            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (labelDefRegex.test(line.text)) {
                    return new vscode.Location(document.uri, line.range);
                }
            }

            // Look for macro definitions: "MACRO label_name"
            const macroDefRegex = new RegExp(`^\\s*(?i)MACRO\\s+${word}\\b`, 'i');
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (macroDefRegex.test(line.text)) {
                    return new vscode.Location(document.uri, line.range);
                }
            }

            return null;
        }
    });

    // --- FEATURE 2: HOVER DOCUMENTATION ---
    const hoverProvider = vscode.languages.registerHoverProvider('jasm', {
        provideHover(document, position, token) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) return null;

            const word = document.getText(range).toUpperCase();

            // Check if it's a mnemonic
            if (MNEMONIC_DOCS[word]) {
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**${word}** - Instruction\n\n`);
                markdown.appendText(MNEMONIC_DOCS[word]);
                return new vscode.Hover(markdown, range);
            }

            // Check if it's a register
            if (REGISTER_DOCS[word]) {
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**${word}** - Register\n\n`);
                markdown.appendText(REGISTER_DOCS[word]);
                return new vscode.Hover(markdown, range);
            }

            // Check if it's a directive
            if (DIRECTIVES.includes(word)) {
                const markdown = new vscode.MarkdownString();
                markdown.appendMarkdown(`**${word}** - Directive\n\n`);
                if (word === 'DATA') {
                    markdown.appendMarkdown('Define data constants.\n\n');
                    markdown.appendCodeblock('DATA 0x10, 0x20, "hello"', 'jasm');
                } else if (word === 'IMPORT') {
                    markdown.appendMarkdown('Import external module.\n\n');
                    markdown.appendCodeblock('IMPORT "module.jasm"', 'jasm');
                }
                return new vscode.Hover(markdown, range);
            }

            // Check if it's a label (find its definition) - use original case
            const originalWord = document.getText(range);
            const labelDefRegex = new RegExp(`^\\s*${originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`, 'i');
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (labelDefRegex.test(line.text)) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`**${originalWord}** - Label\n\n`);
                    markdown.appendText(`Defined at line ${i + 1}`);
                    return new vscode.Hover(markdown, range);
                }
            }

            // Check if it's a macro (find its definition) - use original case
            const macroDefRegex = new RegExp(`^\\s*(?i)MACRO\\s+${originalWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (macroDefRegex.test(line.text)) {
                    const markdown = new vscode.MarkdownString();
                    markdown.appendMarkdown(`**${originalWord}** - Macro\n\n`);
                    markdown.appendText(`Defined at line ${i + 1}`);
                    return new vscode.Hover(markdown, range);
                }
            }

            return null;
        }
    });

    // --- FEATURE 3: AUTO-COMPLETION ---
    const completionProvider = vscode.languages.registerCompletionItemProvider('jasm', {
        provideCompletionItems(document, position, token, context) {
            
            // A. Create completion items for Mnemonics (Instructions)
            const mnemonicItems = MNEMONICS.map(mnemonic => {
                const item = new vscode.CompletionItem(mnemonic, vscode.CompletionItemKind.Keyword);
                item.detail = "Instruction";
                item.documentation = new vscode.MarkdownString(`Insert **${mnemonic}** instruction.`);
                return item;
            });

            // B. Create completion items for Registers
            const registerItems = REGISTERS.map(reg => {
                const item = new vscode.CompletionItem(reg, vscode.CompletionItemKind.Variable);
                item.detail = "Register";
                item.documentation = new vscode.MarkdownString(`Register **${reg}**`);
                return item;
            });

            // C. Create completion items for Directives
            const directiveItems = DIRECTIVES.map(directive => {
                const item = new vscode.CompletionItem(directive, vscode.CompletionItemKind.Keyword);
                item.detail = "Directive";
                if (directive === 'DATA') {
                    item.documentation = new vscode.MarkdownString(`**DATA** directive: Define data constants\n\nExample: \`DATA 0x10, 0x20, "hello"\``);
                } else if (directive === 'IMPORT') {
                    item.documentation = new vscode.MarkdownString(`**IMPORT** directive: Import external module\n\nExample: \`IMPORT "module.jasm"\``);
                }
                return item;
            });

            // D. Create completion items for Macro Keywords
            const macroItems = MACRO_KEYWORDS.map(keyword => {
                const item = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                item.detail = "Macro";
                if (keyword === 'MACRO') {
                    item.documentation = new vscode.MarkdownString(`**MACRO** keyword: Define a macro\n\nExample: \`MACRO mymacro %arg1, %arg2\``);
                } else if (keyword === 'END MACRO') {
                    item.documentation = new vscode.MarkdownString(`**END MACRO** keyword: End macro definition`);
                }
                return item;
            });

            // E. Create completion item for macro argument syntax
            const macroArgItem = new vscode.CompletionItem('%', vscode.CompletionItemKind.Snippet);
            macroArgItem.insertText = new vscode.SnippetString('%${1:arg_name}');
            macroArgItem.detail = "Macro Argument";
            macroArgItem.documentation = new vscode.MarkdownString(`Macro argument placeholder\n\nUse \`%arg_name\` in macro definitions and calls.`);

            // Return all suggestions combined
            return [ ...mnemonicItems, ...registerItems, ...directiveItems, ...macroItems, macroArgItem ];
        }
    });

    // Register all providers
    context.subscriptions.push(definitionProvider, hoverProvider, completionProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};