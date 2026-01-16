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

    // --- FEATURE 2: AUTO-COMPLETION ---
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

    // Register both providers
    context.subscriptions.push(definitionProvider, completionProvider);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};