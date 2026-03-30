const vscode = require('vscode');

// Addressing modes reference (name -> short description)
const ADDRESSING_MODES = {
    'REGISTER': 'value in register (reg)',
    'IMMEDIATE': 'immediate value in instruction word (imm16)',
    'REGISTER INDIRECT': 'at memory location in register ([reg])',
    'RELATIVE ADDRESS': 'at PC + immediate ([imm16 + pc])',
    'BASE + OFFSET': 'at immediate + register ([imm16 + reg])'
};

// Single source of truth: instruction name, description, and forms with operand roles/modes
const MNEMONIC_INFO = {
    'HALT': {
        description: 'Halt the processor',
        forms: [{ syntax: 'HALT', operands: [] }]
    },
    'GET': {
        description: 'Load data from memory into a register',
        forms: [
            { syntax: 'GET reg, [reg]', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER INDIRECT' }] },
            { syntax: 'GET reg, [pc + imm16]', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'RELATIVE ADDRESS' }] },
            { syntax: 'GET reg, [imm16 + reg]', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'BASE + OFFSET' }] }
        ]
    },
    'PUT': {
        description: 'Store data from a register into memory',
        forms: [
            { syntax: 'PUT [reg], reg', operands: [{ role: 'dest', mode: 'REGISTER INDIRECT' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'PUT [imm16 + reg], reg', operands: [{ role: 'dest', mode: 'BASE + OFFSET' }, { role: 'src', mode: 'REGISTER' }] }
        ]
    },
    'MOV': {
        description: 'Move data between registers or load immediate',
        forms: [
            { syntax: 'MOV reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'MOV reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'PUSH': {
        description: 'Push a value onto the stack',
        forms: [
            { syntax: 'PUSH reg', operands: [{ role: 'src', mode: 'REGISTER' }] },
            { syntax: 'PUSH imm16', operands: [{ role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'POP': {
        description: 'Pop a value from the stack',
        forms: [{ syntax: 'POP reg', operands: [{ role: 'dest', mode: 'REGISTER' }] }]
    },
    'ADD': {
        description: 'Add two values',
        forms: [
            { syntax: 'ADD reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'ADD reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'ADC': {
        description: 'Add with carry',
        forms: [
            { syntax: 'ADC reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'ADC reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'SUB': {
        description: 'Subtract two values',
        forms: [
            { syntax: 'SUB reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'SUB reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'SBC': {
        description: 'Subtract with carry',
        forms: [
            { syntax: 'SBC reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'SBC reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'INC': {
        description: 'Increment a register',
        forms: [{ syntax: 'INC reg', operands: [{ role: 'dest', mode: 'REGISTER' }] }]
    },
    'DEC': {
        description: 'Decrement a register',
        forms: [{ syntax: 'DEC reg', operands: [{ role: 'dest', mode: 'REGISTER' }] }]
    },
    'LSH': {
        description: 'Logical shift left',
        forms: [
            { syntax: 'LSH reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'LSH reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'RSH': {
        description: 'Logical shift right',
        forms: [
            { syntax: 'RSH reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'RSH reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'AND': {
        description: 'Bitwise AND operation',
        forms: [
            { syntax: 'AND reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'AND reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'OR': {
        description: 'Bitwise OR operation',
        forms: [
            { syntax: 'OR reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'OR reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'NOT': {
        description: 'Bitwise NOT operation',
        forms: [{ syntax: 'NOT reg', operands: [{ role: 'dest', mode: 'REGISTER' }] }]
    },
    'XOR': {
        description: 'Bitwise XOR operation',
        forms: [
            { syntax: 'XOR reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'XOR reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'INB': {
        description: 'Input byte from port',
        forms: [
            { syntax: 'INB reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'INB reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'OUTB': {
        description: 'Output byte to port',
        forms: [
            { syntax: 'OUTB reg, reg', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'OUTB reg, imm16', operands: [{ role: 'dest', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'CMP': {
        description: 'Compare two values',
        forms: [
            { syntax: 'CMP reg, reg', operands: [{ role: 'src', mode: 'REGISTER' }, { role: 'src', mode: 'REGISTER' }] },
            { syntax: 'CMP reg, imm16', operands: [{ role: 'src', mode: 'REGISTER' }, { role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'JMP': {
        description: 'Unconditional jump',
        forms: [
            { syntax: 'JMP reg', operands: [{ role: 'target', mode: 'REGISTER' }] },
            { syntax: 'JMP imm16', operands: [{ role: 'target', mode: 'IMMEDIATE' }] },
            { syntax: 'JMP [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] },
            { syntax: 'JMP [imm16 + reg]', operands: [{ role: 'target', mode: 'BASE + OFFSET' }] }
        ]
    },
    'JZ': {
        description: 'Jump if zero flag is set',
        forms: [{ syntax: 'JZ [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JNZ': {
        description: 'Jump if zero flag is not set',
        forms: [{ syntax: 'JNZ [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JC': {
        description: 'Jump if carry flag is set',
        forms: [{ syntax: 'JC [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JNC': {
        description: 'Jump if carry flag is not set',
        forms: [{ syntax: 'JNC [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JN': {
        description: 'Jump if negative flag is set',
        forms: [{ syntax: 'JN [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JNN': {
        description: 'Jump if negative flag is not set',
        forms: [{ syntax: 'JNN [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JO': {
        description: 'Jump if overflow flag is set',
        forms: [{ syntax: 'JO [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'JNO': {
        description: 'Jump if overflow flag is not set',
        forms: [{ syntax: 'JNO [pc + imm16]', operands: [{ role: 'target', mode: 'RELATIVE ADDRESS' }] }]
    },
    'CALL': {
        description: 'Call a subroutine',
        forms: [
            { syntax: 'CALL reg', operands: [{ role: 'target', mode: 'REGISTER' }] },
            { syntax: 'CALL imm16', operands: [{ role: 'target', mode: 'IMMEDIATE' }] }
        ]
    },
    'RET': {
        description: 'Return from subroutine',
        forms: [{ syntax: 'RET', operands: [] }]
    },
    'INT': {
        description: 'Software interrupt',
        forms: [
            { syntax: 'INT reg', operands: [{ role: 'src', mode: 'REGISTER' }] },
            { syntax: 'INT imm16', operands: [{ role: 'src', mode: 'IMMEDIATE' }] }
        ]
    },
    'IRET': {
        description: 'Return from interrupt',
        forms: [{ syntax: 'IRET', operands: [] }]
    },
    'NOP': {
        description: 'No operation',
        forms: [{ syntax: 'NOP', operands: [] }]
    }
};

// Derive MNEMONICS from MNEMONIC_INFO (single source of truth)
const MNEMONICS = Object.keys(MNEMONIC_INFO);

const REGISTERS = [
    'A', 'B', 'C', 'D', 'E', 'X', 'Y', 'Z', 'F', 'PC', 'SP', 'MB', 
];

const DIRECTIVES = [
    'DATA', 'IMPORT'
];

const MACRO_KEYWORDS = [
    'MACRO', 'END MACRO'
];

/** Build markdown content for a mnemonic (hover or completion docs) */
function buildMnemonicMarkdown(mnemonic) {
    const info = MNEMONIC_INFO[mnemonic];
    if (!info) return null;
    const md = new vscode.MarkdownString();
    md.appendMarkdown(`${mnemonic}: ${info.description}\n\n`);
    md.appendMarkdown('Usage:\n');
    for (const form of info.forms) {
        md.appendCodeblock(form.syntax, 'jasm');
    }
    return md;
}

// Documentation for registers
const REGISTER_DOCS = {
    'A': 'General purpose register A',
    'B': 'General purpose register B',
    'C': 'General purpose register C',
    'D': 'General purpose register D',
    'E': 'General purpose register E',
    'X': 'Index register X',
    'Y': 'Index register Y',
    'Z': 'Index register Z',
    'PC': 'Program Counter - points to the next instruction',
    'SP': 'Stack Pointer - points to the top of the stack',
    'MB': 'Memory Bank register',
    'F': 'Flags register',
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
            if (MNEMONIC_INFO[word]) {
                const markdown = buildMnemonicMarkdown(word);
                if (markdown) return new vscode.Hover(markdown, range);
            }

            // Check if it's a register
            if (REGISTER_DOCS[word]) {
                const markdown = new vscode.MarkdownString();
                markdown.appendText(REGISTER_DOCS[word]);
                return new vscode.Hover(markdown, range);
            }

            // Check if it's a directive
            if (DIRECTIVES.includes(word)) {
                const markdown = new vscode.MarkdownString();
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
                    markdown.appendText(`${originalWord}: defined at line ${i + 1}`);
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
                item.documentation = buildMnemonicMarkdown(mnemonic) || new vscode.MarkdownString(`Insert **${mnemonic}** instruction.`);
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