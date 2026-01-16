# JASM Language Support

This extension provides syntax highlighting, code navigation, and IntelliSense for JASM, the custom assembly language of the jaide architecture. 

Supported file extension: `.jasm`

## Release Notes

**0.0.3**

- Added new langauge features (import + data directives, macros, expressions)
- Changed some langauge attributes match the updated spec

**0.0.2**

- Added repository field to package.json

**0.0.1**

- Initial release!
- Syntax highlighting.
- "Go to Definition" for labels.
- Auto-completion for mnemonics and registers.


### Building and Installing

**Requirements:** Node.js v20 or higher (check with `node --version`)

1. **Install VS Code Extension Manager (vsce)**
```bash
npm install -g @vscode/vsce
```

2. **Package the extension**
```bash
vsce package
```
This creates a `.vsix` file in the current directory.

3. **Install the extension locally**

In VS Code, press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac), then select "Extensions: Install from VSIX..." and choose the generated `.vsix` file.

Or install from the command line:
```bash
code --install-extension jasm-vscode-0.0.2.vsix
```
(Replace `0.0.2` with the version number from `package.json`)
