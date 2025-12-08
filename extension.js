const vscode = require('vscode');

// 1. Define the data from your Lark Grammar
const MNEMONICS = [
    'LOAD', 'STORE', 'MOVE', 'PUSH', 'POP', 'ADD', 'ADDC', 'SUB', 'SUBB', 
    'INC', 'DEC', 'SHL', 'SHR', 'AND', 'OR', 'NOR', 'NOT', 'XOR', 'INB', 'OUTB', 
    'CMP', 'SEC', 'CLC', 'CLZ', 'JMP', 'JZ', 'JNZ', 'JC', 'JNC', 'INT', 'HALT', 'NOP'
];

const REGISTERS = [
    'A', 'B', 'C', 'D', 'X', 'Y', 'SP', 'PC', 'Z', 'F', 'MB', 'STS'
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

            // Return all suggestions combined
            return [ ...mnemonicItems, ...registerItems ];
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