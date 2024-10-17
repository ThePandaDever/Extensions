(function(Scratch) {
    "use strict";

    var asts = {};
    var file_requests = [];
    var file_system = {};

    var local_system = {};

    var api_requests = {};
    var api_data = {};

    // imurmurhash-js
    function murmurhash3_32_gc(key, seed) {
        var remainder, bytes, h1, h1b, c1, c1b, c2, c2b, k1, i;

        remainder = key.length & 3; // key.length % 4
        bytes = key.length - remainder;
        h1 = seed;
        c1 = 0xcc9e2d51;
        c2 = 0x1b873593;
        i = 0;

        while (i < bytes) {
            k1 =
                ((key.charCodeAt(i) & 0xff)) |
                ((key.charCodeAt(++i) & 0xff) << 8) |
                ((key.charCodeAt(++i) & 0xff) << 16) |
                ((key.charCodeAt(++i) & 0xff) << 24);
            ++i;

            k1 = ((((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16))) & 0xffffffff;
            k1 = (k1 << 15) | (k1 >>> 17);
            k1 = ((((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16))) & 0xffffffff;

            h1 ^= k1;
            h1 = (h1 << 13) | (h1 >>> 19);
            h1b = ((((h1 & 0xffff) * 5) + ((((h1 >>> 16) * 5) & 0xffff) << 16))) & 0xffffffff;
            h1 = (((h1b & 0xffff) + 0x6b64) + ((((h1b >>> 16) + 0xe654) & 0xffff) << 16));
        }

        k1 = 0;

        switch (remainder) {
            case 3: k1 ^= (key.charCodeAt(i + 2) & 0xff) << 16;
            case 2: k1 ^= (key.charCodeAt(i + 1) & 0xff) << 8;
            case 1: k1 ^= (key.charCodeAt(i) & 0xff);

                k1 = (((k1 & 0xffff) * c1) + ((((k1 >>> 16) * c1) & 0xffff) << 16)) & 0xffffffff;
                k1 = (k1 << 15) | (k1 >>> 17);
                k1 = (((k1 & 0xffff) * c2) + ((((k1 >>> 16) * c2) & 0xffff) << 16)) & 0xffffffff;
                h1 ^= k1;
        }

        h1 ^= key.length;

        h1 ^= h1 >>> 16;
        h1 = (((h1 & 0xffff) * 0x85ebca6b) + ((((h1 >>> 16) * 0x85ebca6b) & 0xffff) << 16)) & 0xffffffff;
        h1 ^= h1 >>> 13;
        h1 = ((((h1 & 0xffff) * 0xc2b2ae35) + ((((h1 >>> 16) * 0xc2b2ae35) & 0xffff) << 16))) & 0xffffffff;
        h1 ^= h1 >>> 16;

        return h1 >>> 0;
    }

    const {
        BlockType,
        ArgumentType
    } = Scratch;

    // cyrb53 currently.
    const hashstring = (str, seed = 0) => {
        let h1 = 0xdeadbeef ^ seed,
            h2 = 0x41c6ce57 ^ seed;
        for (let i = 0, ch; i < str.length; i++) {
            ch = str.charCodeAt(i);
            h1 = Math.imul(h1 ^ ch, 2654435761);
            h2 = Math.imul(h2 ^ ch, 1597334677);
        }
        h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
        h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
        h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
        h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);

        return 4294967296 * (2097151 & h2) + (h1 >>> 0);
    };

    function removeCurlyBraces(input) {
        // Use a regular expression to remove curly braces at the start and end of the string
        return input.replace(/^\{|\}$/g, '').trim();
    }

    function removeSquareBraces(input) {
        // Use a regular expression to remove square braces at the start and end of the string
        return input.replace(/^\[|\]$/g, '').trim();
    }

    function removeBraces(input) {
        // Use a regular expression to remove braces at the start and end of the string
        return input.replace(/^\(|\)$/g, '').trim();
    }

    function removeComments(code) {
        // First, remove multi-line comments
        let noMultiLineComments = code.replace(/\/\*[\s\S]*?\*\//g, '');

        // Then, remove single-line comments
        let noComments = noMultiLineComments.replace(/\/\/.*/g, '');

        // Return the cleaned-up code without comments
        return noComments;
    }

    function isCurlyBrackets(input) {
        return input[0] == "{" && input[input.length - 1] == "}";
    }

    function isSquareBrackets(input) {
        return input[0] == "[" && input[input.length - 1] == "]";
    }

    function isBrackets(input) {
        return input[0] == "(" && input[input.length - 1] == ")";
    }

    const isNumeric = (string) => /^[+-]?\d+(\.\d+)?$/.test(string);
    function isValidReference(str) {
        const regex = /^[A-Za-z0-9_@#]+$/;
        return regex.test(str);
    }

    function arrayEquals(a, b) {
        return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((val, index) => val === b[index]);
    }
    // id be dead if mist didnt make this :pray:
    Object.isSame = function (obj1,obj2) {
        if (typeof obj1 === "object" && typeof obj2 === "object") {
            if (obj1 === obj2) return true;

            let obj1Keys = Object.keys(obj1);
            let obj2Keys = Object.keys(obj2);
            if (obj1Keys.length !== obj2Keys.length) return false;

            for (let key of obj2Keys) {
              if (!obj1Keys.includes(key)) return false;
              const obj1Type = typeof obj1[key];
              const obj2Type = typeof obj2[key];
              if (obj1Type !== obj2Type) return false;
              if (obj1Type === "object" && obj2Type === "object") {
                if (!Object.isSame(obj1[key], obj2[key])) return false;
              } else if (obj1[key] !== obj2[key]) return false;
            }
            return true;
        } else {
            return false;
        }
    }
    Object.flip = function (obj) {
      let newObj = {};
      for (let key in obj) {
        newObj[obj[key]] = key;
      }
      return newObj;
    }


    function splitLogic(input) {
        const result = [];
        let buffer = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBrackets = 0;
        let inBraces = 0;
        let inParens = 0;

        const logicalOperatorsRegex = /(\|\||&&)/;
        // Match logical operators

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            // Toggle flags for quotes
            if (char === "'" && !inDoubleQuote) {
                inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote) {
                inDoubleQuote = !inDoubleQuote;
            }

            // Track brackets, braces, and parentheses nesting
            if (!inSingleQuote && !inDoubleQuote) {
                if (char === '[') {
                    inBrackets++;
                } else if (char === ']') {
                    inBrackets--;
                } else if (char === '{') {
                    inBraces++;
                } else if (char === '}') {
                    inBraces--;
                } else if (char === '(') {
                    inParens++;
                } else if (char === ')') {
                    inParens--;
                }
            }

            // Check if we're outside quotes, brackets, braces, and parentheses
            if (!inSingleQuote && !inDoubleQuote && inBrackets === 0 && inBraces === 0 && inParens === 0) {
                // Look ahead to see if we match a logical operator starting at this position
                const remainingInput = input.slice(i);
                const operatorMatch = remainingInput.match(logicalOperatorsRegex);

                // If a logical operator is found at the beginning of the remaining input
                if (operatorMatch && operatorMatch.index === 0) {
                    // Push the current buffer content to the result (if there's anything in it)
                    if (buffer.trim()) {
                        result.push(buffer.trim());
                        buffer = '';
                        // Clear buffer
                    }

                    // Push the matched operator to the result
                    result.push(operatorMatch[0]);

                    // Move the index to the end of the matched operator
                    i += operatorMatch[0].length - 1;
                    // -1 because `i++` will happen at the end of the loop
                    continue;
                    // Move to the next iteration after processing the operator
                }
            }

            // Append the current character to the buffer if it's not part of an operator
            buffer += char;
        }

        // Push any remaining buffer content to the result
        if (buffer.trim()) {
            result.push(buffer.trim());
        }

        return result;
    }
    function splitOperators(input) {
        const operators = /(\+{1,2}|-|\*|\/)/;
        const result = [];
        let buffer = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBrackets = 0;
        let inBraces = 0;
        let inParens = 0;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            // Toggle flags for quotes
            if (char === "'" && !inDoubleQuote && !inBrackets && !inBraces && !inParens) {
                inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote && !inBrackets && !inBraces && !inParens) {
                inDoubleQuote = !inDoubleQuote;
            }

            // Track brackets, braces, and parentheses nesting
            if (!inSingleQuote && !inDoubleQuote) {
                if (char === '[') {
                    inBrackets++;
                } else if (char === ']') {
                    inBrackets--;
                } else if (char === '{') {
                    inBraces++;
                } else if (char === '}') {
                    inBraces--;
                } else if (char === '(') {
                    inParens++;
                } else if (char === ')') {
                    inParens--;
                }
            }

            // Split on operators only when not inside quotes, brackets, braces, or parentheses
            if (operators.test(char) && (!(operators.test(input[i - 1]) || (input[i - 1] == " " && (input[i + 1] != " " || operators.test(input[i + 1]))))) && !(char == "+" && input[i + 1] == "+") && !inSingleQuote && !inDoubleQuote && inBrackets === 0 && inBraces === 0 && inParens === 0) {
                if (buffer.trim()) {
                    result.push(buffer.trim());
                }
                result.push(char);
                // Keep the operator as a separate element
                buffer = '';
            } else {
                if (input[i] == "+" && input[i+1] == "+") {
                    result.push(buffer.trim());
                    buffer = '';
                }
                if (input[i-1] == "+" && input[i - 2] == "+") {
                    result.push(buffer.trim());
                    buffer = '';
                }
                buffer += char;
            }
        }

        // Push the last buffer if not empty
        if (buffer.trim()) {
            result.push(buffer.trim());
        }
        return result;
    }
    function splitComparsion(input) {
        const operators = /(==|!=|~=|\?=|>=|<=)/;
        const result = [];
        let buffer = '';
        let inSingleQuote = false;
        let inDoubleQuote = false;
        let inBrackets = 0;
        let inBraces = 0;
        let inParens = 0;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const nextChar = input[i + 1];

            // Toggle flags for quotes
            if (char === "'" && !inDoubleQuote && !inBrackets && !inBraces && !inParens) {
                inSingleQuote = !inSingleQuote;
            } else if (char === '"' && !inSingleQuote && !inBrackets && !inBraces && !inParens) {
                inDoubleQuote = !inDoubleQuote;
            }

            // Track brackets, braces, and parentheses nesting
            if (!inSingleQuote && !inDoubleQuote) {
                if (char === '[') {
                    inBrackets++;
                } else if (char === ']') {
                    inBrackets--;
                } else if (char === '{') {
                    inBraces++;
                } else if (char === '}') {
                    inBraces--;
                } else if (char === '(') {
                    inParens++;
                } else if (char === ')') {
                    inParens--;
                }
            }

            // Check for multi-character operators (==, !=, ~=, etc.)
            if (operators.test(char + nextChar) && !inSingleQuote && !inDoubleQuote && inBrackets === 0 && inBraces === 0 && inParens === 0) {
                if (buffer.trim()) {
                    result.push(buffer.trim());
                }
                result.push(char + nextChar);
                // Add the operator as a separate element
                buffer = '';
                i++;
                // Skip the next character as it's part of the operator
            } // Check for single-character operators (<, >)
            else if ([">", "<"].includes(char) && !inSingleQuote && !inDoubleQuote && inBrackets === 0 && inBraces === 0 && inParens === 0) {
                if (buffer.trim()) {
                    result.push(buffer.trim());
                }
                result.push(char);
                // Add the single-character operator
                buffer = '';
            } // Append the character to the buffer if it's not part of an operator
            else {
                buffer += char;
            }
        }

        // Push the last buffer if not empty
        if (buffer.trim()) {
            result.push(buffer.trim());
        }
        return result;
    }
    function splitStatement(input) {
        const result = [];
        let currentPart = '';
        let braceCount = 0;
        let parenCount = 0;
        // Track parentheses
        let i = 0;
        let insideQuotes = false;
        // Track if we are inside quotes
        let quoteType = '';
        // Track the type of quote (either ' or ")

        while (i < input.length) {
            const char = input[i];

            // Check for the start of a quote
            if (char === '"' || char === "'") {
                // If we're not already inside quotes, enter quotes
                if (!insideQuotes) {
                    insideQuotes = true;
                    quoteType = char;
                    // Remember the type of quote
                } else if (char === quoteType) {
                    // If we encounter the same type of quote, exit quotes
                    insideQuotes = false;
                }
            }

            // If we are outside quotes, handle braces and parentheses
            if (!insideQuotes) {
                if (char === '(') {
                    parenCount++;
                    // Enter parentheses
                    currentPart += char;
                    // Add the opening parenthesis
                } else if (char === ')') {
                    parenCount--;
                    // Exit parentheses
                    currentPart += char;
                    // Add the closing parenthesis
                } else if (char === '{') {
                    // Push the part before the brace if not inside parentheses
                    if (parenCount === 0 && braceCount == 0) {
                        if (currentPart.trim()) {
                            result.push(currentPart.trim());
                            currentPart = '';
                            // Reset for the next part
                        }
                    }
                    currentPart += char;
                    // Add the opening brace
                    braceCount++;
                } else if (char === '}') {
                    braceCount--;
                    currentPart += char;
                    // Add the closing brace
                    if (parenCount === 0 && braceCount == 0) {
                        if (currentPart.trim()) {
                            result.push(currentPart.trim());
                            currentPart = '';
                            // Reset for the next part
                        }
                    }
                } else if (char === ';' && braceCount === 0 && parenCount === 0) {
                    // Finalize on semicolon only if not inside braces or parentheses
                    result.push(currentPart.trim());
                    currentPart = '';
                    // Reset for the next part
                } else {
                    currentPart += char;
                    // Collect other characters
                }
            } else {
                currentPart += char;
                // Add characters inside quotes directly
            }

            i++;
        }

        // Push any remaining part that wasn't processed
        if (currentPart.trim()) {
            result.push(currentPart.trim());
        }
        return result;
    }
    function splitSegment(input) {
        let result = [];
        let current = "";

        let inSingleQuotes = false;
        let inDoubleQuotes = false;

        let bracketDepth = 0;
        let squareDepth = 0;
        let curlyDepth = 0;

        for (let char of input) {
            if (char == '"' && !inSingleQuotes) {
                inDoubleQuotes = !inDoubleQuotes;
            }
            if (char == "'" && !inDoubleQuotes) {
                inSingleQuotes = !inSingleQuotes;
            }

            let inAnyQuotes = inSingleQuotes || inDoubleQuotes;

            if (!inAnyQuotes) {
                switch (char) {
                    case "{":
                        curlyDepth ++;
                        current += char;
                        break
                    case "}":
                        curlyDepth --;
                        current += char;
                        if (bracketDepth == 0 && curlyDepth == 0 && squareDepth == 0) {
                            if (current) {
                                result.push(current.trim());
                                current = "";
                            }
                        }
                        break;

                    case "[":
                        squareDepth ++;
                        current += char;
                        break
                    case "]":
                        squareDepth --;
                        current += char;
                        break;

                    case "(":
                        bracketDepth ++;
                        current += char;
                        break
                    case ")":
                        bracketDepth --;
                        current += char;
                        break;

                    case ";":
                        if (bracketDepth == 0 && curlyDepth == 0 && squareDepth == 0) {
                            if (current) {
                                result.push(current.trim());
                                current = "";
                            }
                        } else {
                            current += char;
                        }
                        break

                    default:
                        current += char;
                }
            } else {
                current += char;
            }
        }

        if (current) {
            result.push(current.trim());
        }

        return result;
    }
    function splitAssignment(str) {
        let insideQuotes = false;
        let insideBrackets = 0;
        // Track how deep we are inside brackets
        let escapeNext = false;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            // Handle escaping (e.g. \")
            if (escapeNext) {
                escapeNext = false;
                continue;
            }
            if (char === '\\') {
                escapeNext = true;
                continue;
            }

            // Toggle for quotes
            if (char === '"' || char === "'") {
                insideQuotes = !insideQuotes;
                continue;
            }

            // Handle brackets and parentheses
            if (!insideQuotes) {
                if (char === '[' || char === '{' || char === '(') {
                    insideBrackets++;
                } else if (char === ']' || char === '}' || char === ')') {
                    insideBrackets--;
                }
            }

            // Split at first '=' not inside quotes or brackets
            if (char === '=' && !insideQuotes && insideBrackets === 0 && str[i-1] == " " && str[i+1] == " ") {
                // Split and return trimmed parts
                return [str.slice(0, i).trim(), str.slice(i + 1).trim()];
            }
        }

        // If no '=' is found, return the original string and an empty string
        return [];
    }
    function splitByFirstSpace(str) {
        const firstSpaceIndex = str.indexOf(' ');
    
        if (firstSpaceIndex === -1) {
            return [str];
        }
    
        const firstPart = str.slice(0, firstSpaceIndex);
        const secondPart = str.slice(firstSpaceIndex + 1);
    
        return [firstPart, secondPart];
    }
    function splitCharedCommand(str, chr) {
        const result = [];
        let buffer = '';
        let insideDoubleQuotes = false;
        let insideSingleQuotes = false;
        let parensDepth = 0;
        let curlyDepth = 0;
        let squareDepth = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            // Handle quote states
            if (char === '"' && !insideSingleQuotes && parensDepth === 0 && curlyDepth === 0 && squareDepth === 0) {
                insideDoubleQuotes = !insideDoubleQuotes;
                buffer += char;
                continue;
            }
            if (char === "'" && !insideDoubleQuotes && parensDepth === 0 && curlyDepth === 0 && squareDepth === 0) {
                insideSingleQuotes = !insideSingleQuotes;
                buffer += char;
                continue;
            }

            // Handle brackets depth
            if (!insideDoubleQuotes && !insideSingleQuotes) {
                if (char === '(') {
                    parensDepth++;
                    buffer += char;
                    continue;
                }
                if (char === '{') {
                    curlyDepth++;
                    buffer += char;
                    continue;
                }
                if (char === '[') {
                    squareDepth++;
                    buffer += char;
                    continue;
                }
                if (char === ')' && parensDepth > 0) {
                    parensDepth--;
                    buffer += char;
                    continue;
                }
                if (char === '}' && curlyDepth > 0) {
                    curlyDepth--;
                    buffer += char;
                    continue;
                }
                if (char === ']' && squareDepth > 0) {
                    squareDepth--;
                    buffer += char;
                    continue;
                }
            }

            // Split by spaces if not inside quotes or brackets
            if (char === chr && !insideDoubleQuotes && !insideSingleQuotes && parensDepth === 0 && curlyDepth === 0 && squareDepth === 0) {
                if (buffer.length > 0) {
                    result.push(buffer.trim());
                    buffer = '';
                }
            } else {
                buffer += char;
            }
        }

        // Push the final buffer
        if (buffer.length > 0) {
            result.push(buffer.trim());
        }

        return result;
    }
    function splitCommand(input) {
        const result = [];
        let currentPart = '';
        let isInQuotes = false;
        let quoteChar = '';
        let depth = 0;
        let cdepth = 0;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            // Handle quotes (either single ' or double ")
            if (isInQuotes) {
                currentPart += char;
                if (char === quoteChar) {
                    isInQuotes = false;
                    // End of quoted part
                }
            } else if (char === '"' || char === "'") {
                isInQuotes = true;
                quoteChar = char;
                currentPart += char;
            } // Handle opening brackets (parentheses, curly braces, square brackets)
            else if (char === '(') {
                if (depth == 0 && cdepth == 0) {
                    result.push(currentPart.trim());
                    currentPart = "(";
                } else {
                    currentPart += "(";
                }
                depth++;
            } // Handle closing parentheses
            else if (char === ')') {
                depth--;
                if (depth == 0 && cdepth == 0) {
                    currentPart += ")";
                    result.push(currentPart.trim());
                    currentPart = "";
                } else {
                    currentPart += ")";
                }
            } // Regular characters
            else {
                currentPart += char;
            }
            if (char === '{') {
                cdepth++;
            } else if (char === '}') {
                cdepth--;
            }
        }

        if (currentPart != "") {
            result.push(currentPart.trim())
        }

        return result;
    }
    function splitReferences(str) {
        const result = [];
        let buffer = '';
        let parensDepth = 0;
        let curlyDepth = 0;
        let squareDepth = 0;
        let isInQuotes = false;
        let quoteChar = "";

        for (let i = 0; i < str.length; i++) {
            const char = str[i];

            if (isInQuotes) {
                buffer += char;
                if (char === quoteChar) {
                    isInQuotes = false;
                    // End of quoted part
                }
                continue;
            } else if (char === '"' || char === "'") {
                isInQuotes = true;
                quoteChar = char;
                buffer += char;
                continue;
            }

            if (char === '(') parensDepth++;
            if (char === '{') curlyDepth++;
            if (char === '[') squareDepth++;

            if (char === ')') parensDepth--;
            if (char === '}') curlyDepth--;
            if (char === ']') squareDepth--;

            // Handle brackets opening
            if (char === '[' && squareDepth == 1) {

                if (parensDepth === 0 && curlyDepth === 0) {
                    if (buffer != "") {
                        result.push(buffer);
                        buffer = '';
                    }
                }

                // Start a new bracketed section
                buffer += char;

                continue;
            }

            // Handle brackets closing
            if (char === ']' && squareDepth == 0) {

                buffer += char; // Add closing bracket

                // Decrease depth for corresponding bracket type

                // If we've closed all the depth of that type, push the buffer
                if (parensDepth === 0 && curlyDepth === 0) {
                    result.push(buffer);
                    buffer = '';
                }
                continue;
            }

            buffer += char;
        }

        // Push any remaining buffer
        if (buffer.length > 0) {
            result.push(buffer);
        }

        return result;
    }
    function splitCommandParams(input) {
        const result = [];
        let currentSegment = '';
        let inDoubleQuotes = false;
        let inSingleQuotes = false;
        let inCurlyBraces = 0;
        let inSquareBrackets = 0;
        let inParentheses = 0;

        for (let i = 0; i < input.length; i++) {
            const char = input[i];

            // Handle escaping in quotes (e.g. "this, is a \"comma\" example")
            if (inDoubleQuotes && char === '\\' && i + 1 < input.length) {
                currentSegment += char + input[i + 1];
                i++;
                // Skip the escaped character
                continue;
            } else if (inSingleQuotes && char === '\\' && i + 1 < input.length) {
                currentSegment += char + input[i + 1];
                i++;
                // Skip the escaped character
                continue;
            }

            // Handle opening and closing of delimiters
            if (char === '"' && !inSingleQuotes && !inCurlyBraces && !inSquareBrackets && !inParentheses) {
                inDoubleQuotes = !inDoubleQuotes;
                currentSegment += char;
            } else if (char === "'" && !inDoubleQuotes && !inCurlyBraces && !inSquareBrackets && !inParentheses) {
                inSingleQuotes = !inSingleQuotes;
                currentSegment += char;
            } else if (char === '{' && !inDoubleQuotes && !inSingleQuotes) {
                inCurlyBraces++;
                currentSegment += char;
            } else if (char === '}' && !inDoubleQuotes && !inSingleQuotes) {
                inCurlyBraces--;
                currentSegment += char;
            } else if (char === '[' && !inDoubleQuotes && !inSingleQuotes) {
                inSquareBrackets++;
                currentSegment += char;
            } else if (char === ']' && !inDoubleQuotes && !inSingleQuotes) {
                inSquareBrackets--;
                currentSegment += char;
            } else if (char === '(' && !inDoubleQuotes && !inSingleQuotes) {
                inParentheses++;
                currentSegment += char;
            } else if (char === ')' && !inDoubleQuotes && !inSingleQuotes) {
                inParentheses--;
                currentSegment += char;
            } else if (char === ',' && !inDoubleQuotes && !inSingleQuotes && inCurlyBraces === 0 && inSquareBrackets === 0 && inParentheses === 0) {
                // Split if comma is outside of any delimiters
                result.push(currentSegment.trim());
                currentSegment = '';
            } else {
                currentSegment += char;
            }
        }

        // Push the last segment if it exists
        if (currentSegment) {
            result.push(currentSegment.trim());
        }
        return result;
    }

    function generateAstFunction(content) {
        let ast = {
            "content": generateAstSegment(content)
        };

        return ast;
    }
    function generateAstSegment(content) {
        let ast = []
        for (let segment_i = 0; segment_i < content.length; segment_i++) {
            let segment_item = generateAstSegmentItem(splitCommand(removeComments(content[segment_i])), removeComments(content[segment_i]));
            if (segment_item != null) {
                ast.push(segment_item);
            }
        }
        return ast;
    }
    function generateAstSegmentItem(content, raw) {
        let ast = {};

        let assign = splitAssignment(raw);
        if (assign.length == 2) {
            ast = {
                "type": "assignment",
                "key": assign[0],
                "value": generateAstArgument(assign[1])
            }
        } else {
            if (content.length == 2) {
                if (!isBrackets(content[0]) && !isCurlyBrackets(content[0]) && isBrackets(content[1]) && !isCurlyBrackets(content[1])) {
                    return generateAstCommand(content);
                }
            } else if (content.length > 2) {
                if (!isBrackets(content[0]) && !isCurlyBrackets(content[0]) && isBrackets(content[1]) && !isCurlyBrackets(content[1])) {
                    return generateAstStatement(content);
                }
            }

            ast = generateAstArgument(raw, ["standalone"]);
            if (Object.keys(ast).length > 0) {
                return ast;
            }
        }

        if (Object.keys(ast).length == 0) {
            if (raw != "") {
                console.warn("unexpected tokens '", raw, "'");
                ast = {};
            }
        }
        return ast;
    }
    function generateAstCommand(item) {
        let ast = {};

        ast["type"] = "command";
        ast["id"] = item[0];
        ast["args"] = generateAstArguments(splitCommandParams(removeBraces(item[1])));

        return ast;
    }
    function generateAstStatement(item) {
        let ast = {};

        ast["type"] = "command";
        ast["id"] = item[0];
        ast["args"] = generateAstArguments(splitCommandParams(removeBraces(item[1])));
        if (item.length == 3) {
            if (isCurlyBrackets(item[2])) {
                ast["content"] = generateAstSegment(splitSegment(removeCurlyBraces(item[2])));
            }
        }

        return ast;
    }
    function generateAstArguments(args) {
        let arr = [];
        for (let arg of args) {
            arr.push(generateAstArgument(arg));
        }
        return arr;
    }
    function generateAstArgument(item, flags) {
        if (typeof (flags) != 'object') {
            flags = []
        }

        let assign = splitAssignment(item);
        if (assign.length == 2) {
            return {
                "id": "assignment",
                "key": assign[0],
                "value": generateAstArgument(assign[1])
            }
        }

        // numbers
        if (isNumeric(item)) {
            return [Number(item), "number"]
        }

        let logic = splitLogic(item);
        if (logic.length > 1) {
            let data = [];
            let i = 0;
            while (i < logic.length) {
                switch (logic[i]) {
                    case "and":
                        data.push("and");
                        break
                    case "or":
                        data.push("or");
                        break
                    case "&&":
                        data.push("and");
                        break
                    case "||":
                        data.push("or");
                        break
                    default:
                        if (isBrackets(logic[i])) {
                            data.push(generateAstArgument(logic[i]));
                        } else {
                            data.push(generateAstArgument(logic[i]));
                        }
                        break
                }
                i++;
            }
            let ast = {};
            ast["id"] = "logic";
            ast["data"] = data;
            return ast;
        }

        let comparison = splitComparsion(item);
        if (comparison.length == 3) {
            let a = generateAstArgument(comparison[0]);
            let b = generateAstArgument(comparison[2]);
            let type = "";
            let comparison_table = {
                "==": "equal",
                "!=": "not_equal",
                "~=": "string_equal",
                "?=": "type_equal",
                ">": "greater",
                "<": "smaller",
                ">=": "greater_equal",
                "<=": "smaller_equal"
            }
            type = comparison_table[comparison[1]]
            return {
                "id": "comparison",
                "type": type,
                "a": a,
                "b": b
            };
        }

        let operators = splitOperators(item);
        if (operators.length > 1) {
            let data = [];
            let i = 0;
            while (i < operators.length) {
                switch (operators[i]) {
                    case "+": case "++": case "-": case "*": case "/":
                        data.push(operators[i]);
                        break
                    default:
                        data.push(generateAstArgument(operators[i]));
                        break
                }
                i++;
            }
            let ast = {};
            ast["id"] = "operation";
            ast["data"] = data;
            return ast;
        }
        
        let command = splitCommand(item);
        if (command.length == 2) {
            if ((!isBrackets(command[0]) && !isCurlyBrackets(command[0]) && !isSquareBrackets(command[0])) &&
                (isBrackets(command[1]) && !isCurlyBrackets(command[1]) && !isSquareBrackets(command[1]))) {
                return {
                    "id": "function",
                    "key": generateAstArgument(command[0],["func"]),
                    "data": generateAstArguments(splitCommandParams(removeBraces(command[1])))
                }
            }
        }

        let methods = splitCharedCommand(item,".");
        if (methods.length > 1) {
            let ast = {
                "id": "methods",
                "value": generateAstArgument(methods[0]),
                "list": []
            }
            for (let methodi = 1; methodi < methods.length; methodi++) {
                let cmd = splitCommand(methods[methodi])

                let isKey = cmd.length == 1 &&
                    (!isBrackets(cmd[0]) && !isCurlyBrackets(cmd[0]) && !isSquareBrackets(cmd[0]));
                let isMethod = cmd.length == 2 &&
                    (!isBrackets(cmd[0]) && !isCurlyBrackets(cmd[0]) && !isSquareBrackets(cmd[0])) &&
                    (isBrackets(cmd[1]) && !isCurlyBrackets(cmd[1]) && !isSquareBrackets(cmd[1]));

                let type = "unknown";

                if (isKey) { type = "key"; }
                if (isMethod) { type = "method"; }

                switch (type) {
                    case "key":
                        ast["list"].push({
                            "id": "get_key",
                            "key": cmd[0]
                        })
                        break
                    case "method":
                        ast["list"].push({
                            "id": "method",
                            "key": cmd[0],
                            "data": generateAstArguments(
                                splitCommandParams(
                                    removeBraces(cmd[1])
                                )
                            )
                        })
                        break
                }
            }
            return ast;
        }

        // constants
        switch (item) {
            case "true":
                return [true, "bool"];
            case "false":
                return [false, "bool"];
            case "null":
                return [null, "null"];
        }

        // strings
        if (item[0] == '"' && item[item.length - 1] == '"') {
            return [item.substring(1, item.length - 1), "string"];
        }
        if (item[0] == "'" && item[item.length - 1] == "'") {
            return [item.substring(1, item.length - 1), "string"];
        }

        let references = splitReferences(item);
        if (references.length > 1) {
            let ast = {
                "id": "key_get",
                "value": generateAstArgument(references[0])
            }
            let keys = []
            for (let i = 1; i < references.length; i++) {
                if (isSquareBrackets(references[i])) {
                    keys.push({
                        "type": "key",
                        "value": generateAstArgument(removeSquareBraces(references[i]))
                    })
                } else {
                    console.warn("unexpected token '" + references[i] + "'")
                }
            }
            ast["keys"] = keys
            return ast;
        }

        if (isCurlyBrackets(item)) {
            let obj = {
                "id": "object",
                "keys": [],
                "values": []
            };
            let pairs = splitCommandParams(removeCurlyBraces(item))
            for (let pair of pairs) {
                let pair_tokens = splitCharedCommand(pair, ":");
                obj["keys"].push(deStr(pair_tokens[0]));
                obj["values"].push(generateAstArgument(pair_tokens[1]));
            }
            return obj;
        }
        if (isSquareBrackets(item)) {
            let arr = {
                "id": "array",
                "values": []
            }
            let items = splitCommandParams(removeSquareBraces(item))
            for (let itm of items) {
                arr["values"].push(generateAstArgument(itm));
            }
            return arr;
        }

        if (isBrackets(item)) {
            return generateAstArgument(removeBraces(item))
        }

        if (flags.includes("func")) {
            return item;
        }
        if (flags.includes("standalone")) {
            return {}
        }
        if (isValidReference(item)) {
            return {
                "id": "reference",
                "key": item
            };
        } else {
            console.warn("unexpected argument '" + item + "'");
        }
    }
    function generateAst(code) {
        let ast = {
            "functions": {},
            "externals": {},
            "externals_ref": {}
        };

        let topLayer = splitSegment(code);
        for (let i = 0; i < topLayer.length; i++) {
            let def = splitStatement(topLayer[i]);
            let defcmd = splitCommand(def[0]);
            let defspaced = defcmd[0].split(" ");

            switch (defspaced[0]) {
                case "import":
                    if (defspaced.length > 1) {
                        let id = defspaced[1];
                        if (Object.keys(local_system).includes(id)) {
                            if (defspaced.length == 2) {
                                ast["externals"][id] = generateAst(local_system[id]);
                                ast["externals_ref"][id] = id;
                            } else if (defspaced.length == 4) {
                                if (defspaced[2] == "as") {
                                    ast["externals"][id] = generateAst(local_system[id]);
                                    ast["externals_ref"][defspaced[3]] = id;
                                } else {
                                    console.warn("unknown import syntax '" + defspaced.join(" ") + "'");
                                }
                            }
                        } else {
                            console.warn("unknown module '" + defspaced[1] + "'");
                        }
                    }
                    break
                case "fn":
                    let content = []
                    if (def.length == 2) {
                        content = splitSegment(removeCurlyBraces(def[1]));
                    }
                    let ast_fn = generateAstFunction(content);
                    ast_fn["key"] = defspaced[1]

                    if (defcmd.length == 2) {
                        if (isBrackets(defcmd[1])) {
                            let pairs = splitCommandParams(removeBraces(defcmd[1]));
                            if (pairs.length > 0) {

                                let ast_fn_args = {};
                                let ast_fn_arg_map = [];
                                for (let raw_pair of pairs) {
                                    let pair = splitCharedCommand(raw_pair, " ");
                                    if (pair.length == 2) {
                                        ast_fn_args[pair[1]] = pair[0];
                                        ast_fn_arg_map.push(pair[1]);
                                    }
                                }

                                ast_fn["args"] = ast_fn_args
                                ast_fn["arg_map"] = ast_fn_arg_map
                            }
                        }
                    }

                    ast["functions"][defspaced[1]] = ast_fn;
                    break
            }
        }

        return ast;
    }

    function getAst(fsl) {
        let key = murmurhash3_32_gc(fsl);
        if (Object.keys(asts).includes(key)) { return asts[key]; }
        asts[key] = generateAst(fsl);
        return asts[key];
    }
    function getKey(val,keys,ctx) {
        switch (val[1]) {
            case "object": case "module":
                for (let key of keys) {
                    key["value"] = runArgument(key["value"], ctx);
                    switch (key["type"]) {
                        case "key":
                            switch (key["value"][1]) {
                                case "string":
                                    if (Object.keys(val[0]).includes(key["value"][0])) {
                                        val = runArgument(val[0][key["value"][0]], ctx)
                                    } else {
                                        return [null,"null"]
                                    }
                                    break;
                                default:
                                    console.warn("cant get '" + key["value"][1] + "' as key in '" + val[1] + "'")
                                    return [null,"null"]
                            }
                            break;
                        default:
                            console.warn("unknown key type '" + key["type"] + "'")
                            return [null,"null"]
                    }
                }
                break
            case "array": case "string":
                for (let key of keys) {
                    key["value"] = runArgument(key["value"], ctx);
                    switch (key["type"]) {
                        case "key":
                            switch (key["value"][1]) {
                                case "number":
                                    if (Object.keys(val[0]).includes((key["value"][0]-1).toString())) {
                                        let v = val[0][key["value"][0]-1];

                                        // "string"[index]
                                        if (val[1] == "string") {
                                            v = [v,"string"]
                                        }

                                        val = runArgument(v, ctx)
                                    } else {
                                        return [null,"null"]
                                    }
                                    break;
                                default:
                                    console.warn("cant get '" + key["value"][1] + "' as key in '" + val[1] + "'")
                                    return [null,"null"]
                            }
                        default:
                            console.warn("unknown key type '" + key["type"] + "'")
                            return [null,"null"]
                    }
                }
                break
            case "null":
                return [null,"null"]
            default:
                console.warn("cant get item from type '" + val[1] + "'");
                return [null,"null"]
        }
        return val;
    }

    function getStr(value, ctx) {
        if (Array.isArray(value)) {
            switch (value[1]) {
                case "array":
                case "object":
                    return JSON.stringify(value[0]);
            }
            return value[0] + "";
        }
        return "null";
    }
    function getBool(value, ctx) {
        if (value[1] == "null" || (value[0] == false && value[1] == "bool")) {
            return false;
        }
        return true;
    }
    function getNum(value, ctx) {
        if (value[1] == "number") {
            return value[0];
        }
        if (value[1] == "object") {
            return Object.keys(value[0]).length;
        }
        if (value[1] == "array") {
            return value[0].length;
        }
        return 0;
    }

    function deStr(str) {
        // Check if the string starts and ends with the same type of quotes
        if ((str.startsWith('"') && str.endsWith('"')) || (str.startsWith("'") && str.endsWith("'"))) {
            // Remove the surrounding quotes by slicing the string
            return str.slice(1, -1);
        }
        return str; // Return the original string if no surrounding quotes are found
    }

    function loadModulesIntoScope(scope, ast) {
        let flipped_externals_ref = Object.flip(ast.externals_ref);

        for (let external of Object.keys(flipped_externals_ref)) {
            let ext_ast = ast.externals[external];
            let ext = {}

            for (let func of Object.keys(ext_ast.functions)) {
                let ext_fn = ext_ast.functions[func]
                ext[func] = [
                    ext_fn
                ,"function",{"flags":["EXTERNAL"]}]
            }

            let flipped_moduless_ref = Object.flip(ext_ast.externals_ref);

            ext = loadModulesIntoScope(ext, ext_ast)

            scope[flipped_externals_ref[external]] = [ext, "module"]
        }
        return scope
    }

    function runFunction(ast, func, scope = {}) {
        if (typeof (ast) != "object") {
            return;
        }

        let functions = ast["functions"];

        console.log(func, functions);
        if (!(func in functions)) {
            console.warn("couldnt find function" + func);
            return;
        }

        let fn = functions[func];

        scope["fsl"] = [{},"object",{"type":"FSLOBJECT"}]

        scope = loadModulesIntoScope(scope, ast);

        for (let fn of Object.keys(functions)) {
            scope[fn] = [
                functions[fn]
            ,"function",{"flags":["LOCAL"]}]
        }

        let ctx = {
            "functions": functions,
            "ast": ast,
            "scope": scope
        };

        console.group("func run")        
        for (let content of fn["content"]) {
            console.group(content["type"] + ": " + content["id"]);
            console.log(content["type"]);
            if (content["type"]) {}
            runCommand(content, ctx);
            console.groupEnd();
        }
        console.groupEnd();
        
        return [null,"null"];
    }
    function runCommand(content, ctx) {
        switch (content.type) {
            case "command":
                switch (content.id) {
                    case "print":
                        let str = "";
                        let i = content.args.length;
                        for (let arg of content.args) {
                            i--;
                            if (i == 0) {
                                str += getStr(runArgument(arg, ctx));
                            } else {
                                str += getStr(runArgument(arg, ctx)) + ", ";
                            }
                        }
                        console.log(str.trim());
                        break
                    case "log":
                        console.log(runArgument(content.args[0],ctx)[0])
                        break
                    case "api_call":
                        if (content.args.length != 3) {return}

                        let api = runArgument(content.args[0]);
                        let api_cmd = runArgument(content.args[1]);
                        let api_data = runArgument(content.args[2]);

                        if (api[1] != "string") { return }
                        if (api_cmd[1] != "string") { return }
                        if (api_data[1] != "object") { return }

                        api_call(
                            api[0],
                            api_cmd[0],
                            api_data[0]
                        );

                        break
                    case "file_call":
                        if (content.args.length != 4) {return}

                        let file_cmd = runArgument(content.args[0]);
                        let file_path = runArgument(content.args[1]);
                        let file_data = runArgument(content.args[2]);
                        let file_path2 = runArgument(content.args[3]);

                        if (file_cmd[1] != "string") { return }
                        if (file_path[1] != "string") { return }
                        if (file_data[1] != "object") { return }
                        if (file_path2[1] != "string") { return }

                        file_call(
                            file_cmd[0],
                            file_path[0],
                            file_data[0],
                            file_path2[0]
                        );

                        break
                    case "if":
                        if (content["args"].length == 1) {
                            let v = runArgument(content["args"][0], ctx);
                            if (getBool(v)) {
                                for (let cmd of content["content"]) {
                                    runCommand(cmd, ctx);
                                }
                            }
                        }
                        break
                    case "while":
                        if (content["args"].length == 1) {
                            let v = runArgument(content["args"][0], ctx);
                            while (getBool(v)) {
                                for (let cmd of content["content"]) {
                                    runCommand(cmd, ctx);
                                }
                                v = runArgument(content["args"][0], ctx);
                            }
                        }
                        break
                    case "for":
                        if (content["args"].length == 1) {
                            // for (amt)
                            let iter = getNum(runArgument(content["args"][0]))
                            for (let i = 0; i < iter; i++) {
                                for (let cmd of content["content"]) {
                                    runCommand(cmd, ctx);
                                }
                            }
                        } else if (content["args"].length == 2) {
                            // for (i = 0, i < 10)
                            runArgument(content.args[0], ctx);
                            if (content.args[0].id != "assignment") {
                                console.warn("first arg must be assignment");
                                return;
                            }
                            let var_key = content.args[0].key;
                            let cond = runArgument(content.args[1], ctx);
                            while (getBool(cond)) {
                                for (let cmd of content["content"]) {
                                    runCommand(cmd, ctx);
                                }
                                ctx.scope[var_key][0] += 1;
                                cond = runArgument(content.args[1], ctx);
                            }
                        } else if (content["args"].length == 3) {
                            // for (i = 0, i < 10, 1)
                            runArgument(content.args[0], ctx);
                            if (content.args[0].id != "assignment") {
                                console.warn("first arg must be assignment");
                                return;
                            }
                            let var_key = content.args[0].key;
                            let cond = runArgument(content.args[1], ctx);
                            let step = runArgument(content.args[2], ctx);
                            if (step[1] != "number") {
                                console.warn("step must be number");
                                return;
                            }
                            while (getBool(cond) && ctx.scope[var_key][0] < 10) {
                                for (let cmd of content["content"]) {
                                    runCommand(cmd, ctx);
                                }
                                ctx.scope[content.args[0].key][0] += step[0];
                                console.log(ctx.scope);
                                cond = runArgument(content.args[1], ctx);
                            }
                        }
                        break
                    default:
                        let call = content;
                        call["key"] = content["id"];
                        call["id"] = "function";
                        return runFunctionCall(call, ctx);
                        break
                }
                break
            case "assignment":
                if (!Object.keys(ctx).includes("scope")) {
                    console.warn("ctx missing scope key.");
                    return;
                }
                ctx.scope[content.key] = runArgument(content.value, ctx)
                break
        }
    }
    function runArgument(content, ctx) {
        if (content == null) {
            return [null,"null"]
        }
        if (content.length == 3) {
            switch (content[2]["type"]) {
                case "FSLOBJECT":
                    let fsl_object = [{
                        "scope": [ctx.scope, "object"],
                        "ast": [ctx.ast, "object"]
                    }, "object"]
                    return fsl_object
            }
        }
        if (typeof (content) === 'object' && !Array.isArray(content)) {
            switch (content["id"]) {
                case "operation":
                    let data = content["data"];
                    let val = data[0];
                    for (let index = 1; index < data.length; index++) {
                        let op = data[index]
                        switch (op) {
                            case "+":
                            case "++":
                            case "-":
                            case "*":
                            case "/":
                                index++;
                                val = runMath(op, runArgument(val, ctx), runArgument(data[index], ctx))
                                break
                        }
                    }
                    return val;
                case "comparison":
                    return runComparison(content["type"], runArgument(content["a"], ctx), runArgument(content["b"], ctx));
                case "reference":
                    if (!Object.keys(ctx).includes("scope")) {
                        console.warn("ctx missing scope key.");
                        return;
                    } else {
                        if (!Object.keys(ctx.scope).includes(content["key"])) {
                            console.warn("unknown reference '" + content["key"] + "'");
                            return [null,"null"];
                        } else {
                            let val = ctx.scope[content["key"]];

                            return runArgument(val,ctx);
                        }
                    }
                case "object":
                    let obj = {};
                    let keys = content["keys"];
                    let values = content["values"];
                    for (let i = 0; i < keys.length; i++) {
                        obj[keys[i]] = runArgument(values[i], ctx);
                    }
                    return [obj, "object"];
                case "array":
                    let arr = [];
                    let items = content["values"];
                    for (let i = 0; i < items.length; i++) {
                        arr.push(runArgument(items[i], ctx));
                    }
                    return [arr, "array"];
                case "key_get":
                    return getKey(runArgument(content["value"], ctx), content["keys"], ctx);
                case "methods":
                    if (true) {
                        let value = runArgument(content["value"], ctx)

                        for (let method of content["list"]) {
                            switch (method["id"]) {
                                case "get_key":
                                    value = runArgument(getKey(value, [{"type":"key","value":[method["key"],"string"]}], ctx), ctx)
                                    break
                                case "method":
                                    value = runMethod(value, method, ctx);
                                    break
                                default:
                                    console.warn("unknown method type '" + method["id"] + "'")
                                    break
                            }
                        }
                        return value;
                    }
                case "assignment":
                    let var_val = runArgument(content["value"], ctx);
                    ctx.scope[content["key"]] = var_val;
                    return var_val
                    break
                case "function":
                    switch (content["type"]) {
                        case "input":
                            return [prompt(getStr(content["data"][0])), "string"]
                            break
                        default:
                            return runFunctionCall(content, ctx);
                    }
                    break
                default:
                    console.warn("unknown arg type '" + content["id"] + "'")
            }
        }
        if (Array.isArray(content)) {
            return content;
        }
    }
    function runFunctionCall(content, ctx) {
        //console.log(content,ctx);
        let key = content["key"]
        if (typeof(key) == "string") { key = {"id": "reference", "key": key} }
        key = runArgument(key,ctx);
        
        if (Object.keys(key).length == 3) {
            if (key[2].flags.includes("EXTERNAL")) {
                
            } else {
                let data = runFunction(ctx.ast, key[0]["key"], {});
            }
        } else { return [null,"null"] }
        
        //runFunction(ctx.ast, key, {})
        return [null,"null"]
    }
    function runMethod(value, method, ctx) {
        switch (value[1]) {
            case "string":
                if (true) {
                    switch (method["key"]) {
                        case "upper":
                            if (method["data"].length != 0) { console.warn("method '" + method["key"] + "' doesnt take " + method["data"].length + " argument(s)"); break }
                            value[0] = value[0].toUpperCase();
                            break
                        case "lower":
                            if (method["data"].length != 0) { console.warn("method '" + method["key"] + "' doesnt take " + method["data"].length + " argument(s)"); break }
                            value[0] = value[0].toLowerCase();
                            break
                        default:
                            console.warn("method '" + method["key"] + "' for type '" + value[1] + "'")
                            break
                    }
                }
                break
            default:
                console.warn("method '" + method["key"] + "' for type '" + value[1] + "'")
                break
        }
        return value;
    }
    function runMath(op, a, b) {
        switch (op) {
            case "+":
                if (a[1] == "number" && b[1] == "number") {
                    return [a[0] + b[0], "number"];
                } else {
                    return [getStr(a) + " " + getStr(b), "string"];
                }
                break
            case "++":
                return [getStr(a) + getStr(b), "string"];
                break
            case "-":
                if (a[1] == "number" && b[1] == "number") {
                    return [a[0] - b[0], "number"]
                }
                break
            case "*":
                if (a[1] == "number" && b[1] == "number") {
                    return [a[0] * b[0], "number"]
                }
                break
            case "/":
                if (a[1] == "number" && b[1] == "number") {
                    return [a[0] / b[0], "number"]
                }
                break
        }
    }
    function runComparison(op, a, b) {
        switch (op) {
            case "equal":
                return [arrayEquals(a, b), "bool"]
            case "not_equal":
                return [!arrayEquals(a, b), "bool"]
            case "string_equal":
                return [getStr(a) === getStr(b), "bool"]
            case "type_equal":
                return [a[1] === b[1], "bool"]
            case "greater":
            case "smaller":
            case "greater_equal":
            case "smaller_equal":
                if (a[1] == "number" && b[1] == "number") {
                    switch (op) {
                        case "greater":
                            return [a[0] > b[0], "bool"]
                        case "smaller":
                            return [a[0] < b[0], "bool"]
                        case "greater_equal":
                            return [a[0] >= b[0], "bool"]
                        case "smaller_equal":
                            return [a[0] <= b[0], "bool"]
                    }
                }
                break
        }
        return [null, "null"]
    }

    function api_call(api,command,data) {
        if (!Object.keys(api_requests).includes(api)) {api_requests[api] = []}
        api_requests[api].push({
            "command":command,
            "data":data
        });
        Scratch.vm.runtime.startHats('fsl_hatApiRequest');
    }
    function file_call(type, path, data, path2) {
        file_requests.push({
            "type":type,
            "path":path,
            "data":data,
            "path2":path2
        });
        Scratch.vm.runtime.startHats('fsl_hatFileRequest');
    }

    function convertArgument(arg, language) {
        if (Array.isArray(arg)) {
            if (arg.length == 2) {
                switch (arg[1]) {
                    case "string":
                        if (language == "osl") {
                            return "\"" + arg[0] + "\""
                        } else if (language == "scratchblocks") {
                            return "[" + arg[0] + "]"
                        }
                }
            }
        }
    }

    function convertCommand(cmd, language) {
        let text = "";

        switch (cmd["id"]) {
            case "print":
                if (language == "osl") {
                    text += "log " + convertArgument(cmd.args[0], language);
                } else if (language == "scratchblocks") {
                    text += "say " + convertArgument(cmd.args[0], language);
                }
        }

        return text;
    }

    function convertSegment(segment, language) {
        let text = "";
        for (let cmd of segment) {
            text += convertCommand(cmd, language) + "\n";
        }
        return text;
    }

    function convertFunction(func, funcname, language, typesafe) {
        let text = "";

        if (language == "osl") {
            let args = "";
            let prm_names = {}, prm_types = {}
            if (func.args) {
                prm_names = Object.keys(func.args);
                prm_types = Object.values(func.args);
                for (let i = 0; i < prm_names.length; i++) {
                    if (i + 1 < prm_names.length) {
                        args += "this." + prm_names[i] + ","
                    } else {
                        args += "this." + prm_names[i]
                    }
                }
            }
            text += "def \"" + funcname + "\"";
            if (args !== "") {
                text += " \"" + args + "\"";
            }
            text += " (\n";
            if (typesafe === "true" && args !== "") {
                let i = 0;
                for (let arg of prm_names) {
                    text += "if " + arg + ".isType(\"" + prm_types[i] + "\").not (; throw \"error\" \"argument '" + arg + "' is not '" + prm_types[i] + "'\"; )\n";
                    i ++;
                }
            }
        } else if (language == "scratchblocks") {
            let args = "";
            if (func.args) {
                let prm_names = Object.keys(func.args);
                let prm_types = Object.values(func.args);
                for (let i = 0; i < prm_names.length; i++) {
                    args += "([" + prm_types[i] + " v] " + prm_names[i] + ")"
                }
            }
            text += "define " + funcname + " " + args + "\n"
        }

        text += convertSegment(func.content, language);

        if (language == "osl") {
            text += ")\nmain";
        } else if (language == "scratchblocks") {
            text += "\n"
        }

        return text;
    }

    function convertAst(data, language, typesafe) {
        let text = "";

        for (let func of Object.keys(data.functions)) {
            text += convertFunction(data.functions[func], func, language, typesafe);
        }

        return text;
    }

    class FSL {
        getInfo() {
            return {
                id: "fsl",
                name: "FSL",
                color1: "#b452ff",
                blocks: [
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: "Settings"
                    },
                    {
                        blockType: Scratch.BlockType.LABEL,
                        text: "General"
                    },
                    {
                        opcode: "fslRun",
                        blockType: BlockType.REPORTER,
                        text: "Run FSL [func] in [fsl]",
                        arguments: {
                            fsl: { type: ArgumentType.STRING, defaultValue: 'fn main() { print("hello world!") }' },
                            func: { type: ArgumentType.STRING, defaultValue: 'main' }
                        }
                    },
                    {
                        opcode: "fslRunScope",
                        blockType: BlockType.REPORTER,
                        text: "Run FSL [func] in [fsl] with [scope] as scope",
                        arguments: {
                            fsl: { type: ArgumentType.STRING, defaultValue: 'fn main() { print("hello world!") }' },
                            func: { type: ArgumentType.STRING, defaultValue: 'main' },
                            scope: {  type: ArgumentType.STRING, defaultValue: '{}' }
                        }
                    },
                    "---",
                    {
                        opcode: "generateAst",
                        blockType: BlockType.REPORTER,
                        text: "Generate AST [fsl]",
                        arguments: {
                            fsl: { type: ArgumentType.STRING, defaultValue: 'fn main() { print("hello world") }' }
                        }
                    },
                    {
                        opcode: "convert",
                        blockType: BlockType.REPORTER,
                        text: "Convert [type] [data] to [language] [typesafe]",
                        arguments: {
                            type: { type: ArgumentType.STRING, defaultValue: 'text', menu: 'convertType' },
                            data: { type: ArgumentType.STRING, defaultValue: 'fn main() { print("hello world") }' },
                            language: { type: ArgumentType.STRING, defaultValue: 'osl', menu: 'convertLanguage' },
                            typesafe: { type: ArgumentType.STRING, defaultValue: 'typesafe', menu: 'convertTypesafe' },
                        }
                    },
                    "---",
                    {
                        opcode: "localUpdate",
                        blockType: BlockType.COMMAND,
                        text: "Set Local System to [data]",
                        arguments: {
                            data: { type: ArgumentType.STRING, defaultValue: '{}' }
                        }
                    },
                    { blockType: Scratch.BlockType.LABEL, text: "File System" },
                    {
                        opcode: "hatFileRequest",
                        blockType: BlockType.EVENT,
                        text: "New File Request",
                        isEdgeActivated: false
                    },
                    {
                        opcode: "fileRequestCreate",
                        blockType: BlockType.COMMAND,
                        text: "Create File Request [type] at [path] and [data] also at (optional) [path2]",
                        arguments: {
                            type: { type: ArgumentType.STRING, defaultValue: 'type' },
                            path: { type: ArgumentType.STRING, defaultValue: 'myfile.txt' },
                            data: { type: ArgumentType.STRING, defaultValue: '{}' },
                            path2: { type: ArgumentType.STRING, defaultValue: 'myfile2.txt' },
                        }
                    },
                    "---",
                    {
                        opcode: "fileRequestData",
                        blockType: BlockType.REPORTER,
                        text: "First File Request's [field]",
                        arguments: {
                            field: { type: ArgumentType.STRING, defaultValue: 'type', menu: 'fileRequestType' }
                        }
                    },
                    {
                        opcode: "fileRequestFull",
                        blockType: BlockType.REPORTER,
                        text: "First File Request as [representation]",
                        arguments: {
                            representation: { type: ArgumentType.STRING, defaultValue: 'json', menu: 'objRepresentation'}
                        }
                    },
                    {
                        opcode: "fileRequestsAll",
                        blockType: BlockType.REPORTER,
                        text: "All File requests as [representation]",
                        arguments: {
                            representation: { type: ArgumentType.STRING, defaultValue: 'json', menu: 'objRepresentation' },
                        }
                    },
                    "---",
                    {
                        opcode: "filePop",
                        blockType: BlockType.COMMAND,
                        text: "Pop latest file request"
                    },
                    {
                        opcode: "fileClear",
                        blockType: BlockType.COMMAND,
                        text: "Clear file requests"
                    },
                    {
                        opcode: "fileUpdate",
                        blockType: BlockType.COMMAND,
                        text: "Set File System to [system]",
                        arguments: {
                            system: { type: ArgumentType.STRING, defaultValue: '{}' }
                        }
                    },
                    { blockType: Scratch.BlockType.LABEL, text: "APIs" },
                    {
                        opcode: "hatApiRequest",
                        blockType: BlockType.EVENT,
                        text: "API Request",
                        isEdgeActivated: false
                    },
                    {
                        opcode: "apiRequestCreate",
                        blockType: BlockType.COMMAND,
                        text: "Create API Request [api] [command] with [data]",
                        arguments: {
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' },
                            command: { type: ArgumentType.STRING, defaultValue: 'myCommand' },
                            data: { type: ArgumentType.STRING, defaultValue: '{}' },
                        }
                    },
                    "---",
                    {
                        opcode: "apiRequestData",
                        blockType: BlockType.REPORTER,
                        text: "First API Request's [field] on [api]",
                        arguments: {
                            field: { type: ArgumentType.STRING, defaultValue: 'command', menu: 'apiRequestType' },
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                    {
                        opcode: "apiRequestFull",
                        blockType: BlockType.REPORTER,
                        text: "First API Request as [representation] on [api]",
                        arguments: {
                            representation: { type: ArgumentType.STRING, defaultValue: 'json', menu: 'objRepresentation' },
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                    {
                        opcode: "apiRequests",
                        blockType: BlockType.REPORTER,
                        text: "API Requests on [api] as [representation]",
                        arguments: {
                            representation: { type: ArgumentType.STRING, defaultValue: 'json', menu: 'objRepresentation' },
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                    {
                        opcode: "apiRequestsAll",
                        blockType: BlockType.REPORTER,
                        text: "All API requests as [representation]",
                        arguments: {
                            representation: { type: ArgumentType.STRING, defaultValue: 'json', menu: 'objRepresentation' },
                        }
                    },
                    "---",
                    {
                        opcode: "apiPop",
                        blockType: BlockType.COMMAND,
                        text: "Pop latest api request on [api]",
                        arguments: {
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                    {
                        opcode: "apiClear",
                        blockType: BlockType.COMMAND,
                        text: "Clear API requests on [api]",
                        arguments: {
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                    {
                        opcode: "apiClearAll",
                        blockType: BlockType.COMMAND,
                        text: "Clear All API requests"
                    },
                    {
                        opcode: "apiUpdate",
                        blockType: BlockType.COMMAND,
                        text: "Set API Data to [data] for [api]",
                        arguments: {
                            data: { type: ArgumentType.STRING, defaultValue: '{}' },
                            api: { type: ArgumentType.STRING, defaultValue: 'myAPI' }
                        }
                    },
                ],
                menus: {
                    boolean: {
                        acceptReporters: true,
                        items: ['true', 'false']
                    },
                    fileRequestType: {
                        acceptReporters: true,
                        items: [
                            'type',
                            'path',
                            'path2',
                            'data',
                        ]
                    },
                    apiRequestType: {
                        acceptReporters: true,
                        items: [
                            "command",
                            "data"
                        ]
                    },
                    objRepresentation: {
                        acceptReporters: true,
                        items: [
                            "json",
                            "object"
                        ]
                    },
                    convertType: {
                        acceptReporters: true,
                        items: [
                            "text",
                            "ast"
                        ]
                    },
                    convertLanguage: {
                        acceptReporters: true,
                        items: [
                            "osl",
                            "js",
                            "scratchblocks"
                        ]
                    },
                    convertTypesafe: {
                        acceptReporters: true,
                        items: [
                            {
                              text: 'typesafe',
                              value: true
                            },
                            {
                              text: 'not typesafe',
                              value: false
                            }
                        ]
                    }
                }
            };
        }

        fslRun({ fsl, func }) {
            let ast = {};
            if (typeof(fsl) !== 'object') {
                ast = getAst(fsl);
            }
            return JSON.stringify(runFunction(ast, func));
        }
        fslRunScope({ fsl, func, scope }) {
            let ast = {};
            if (typeof(fsl) !== 'object') {
                ast = getAst(fsl);
            }
            if (typeof(scope) !== 'object') {
                scope = JSON.parse(scope);
            }
            return JSON.stringify(runFunction(ast, func, scope));
        }

        generateAst({ fsl }) {
            let ast = generateAst(fsl);
            console.log("ast:", ast);
            return JSON.stringify(ast);
        }

        convert({ type, data, language, typesafe }) {
            if (type == "ast") {
                if (typeof(data) === 'string') {
                    data = JSON.parse(data);
                }
            } else if (type == "text") {
                data = generateAst(data);
            }
            if (typeof(data) !== 'object') {
                return "";
            }
            let t = convertAst(data, language, typesafe);
            console.log(t);
            return t;
        }

        localUpdate({ data }) {
            if (typeof(data) === 'string') {
                data = JSON.parse(data);
            }

            local_system = data;
        }

        fileRequestCreate({ type, path, data, path2 }) {
            file_call(type, path, data, path2);
        }
        fileRequestData({ field }) {
            if (file_requests.length > 0) {
                return file_requests[0][field];
            }
            return '';
        }
        fileRequestFull({ representation }) {
            if (file_requests.length == 0) {
                if (representation == "json") {return '{}'}
                return {};
            }
            if (representation == "json") {
                return JSON.stringify(file_requests[0]);
            }
            return file_requests[0];
        }
        fileRequests({ representation }) {
            if (representation == "json") {
                return JSON.stringify(file_requests);
            }
            return file_requests;
        }
        fileRequestsAll({ representation }) {
            if (representation == "json") {
                return JSON.stringify(file_requests);
            }
            return file_requests;
        }
        filePop({ api }) {
            file_requests.shift();
        }
        fileClear() {
            file_requests = [];
        }
        fileUpdate({ sys }) {
            if (typeof(sys) !== 'object' && (typeof(sys) !== 'string')) {return}

            if (typeof(sys) === 'string') {
                sys = JSON.parse(sys);
            }

            file_system = sys;
        }

        apiRequestCreate({ api, command, data }) {
            api_call(api, command, data);
        }
        apiRequestData({ field, api }) {
            if (!Object.keys(api_requests).includes(api)) {return ""}
            if (api_requests[api].length > 0) {
                return api_requests[api][0][field];
            }
            return '';
        }
        apiRequestFull({ representation, api }) {
            if (!Object.keys(api_requests).includes(api)) {if (representation == "json"){return "{}"} return {}}
            if (representation == "json") {
                return JSON.stringify(api_requests[api][0]);
            }
            return api_requests[api][0];
        }
        apiRequests({ api, representation }) {
            if (!Object.keys(api_requests).includes(api)) {if (representation == "json"){return "[]"} return []}
            if (representation == "json") {
                return JSON.stringify(api_requests[api]);
            }
            return api_requests[api];
        }
        apiRequestsAll({ representation }) {
            if (representation == "json") {
                return JSON.stringify(api_requests);
            }
            return api_requests;
        }
        apiPop({ api }) {
            if (!Object.keys(api_requests).includes(api)) {return}
            api_requests[api].shift();
        }
        apiClear({ api }) {
            api_requests[api] = [];
        }
        apiClearAll() {
            api_requests = {}
        }
        apiUpdate({ data, api }) {
            if (typeof(data) !== 'object' && (typeof(data) !== 'string')) {return}

            if (typeof(data) === 'string') {
                data = JSON.parse(data);
            }

            api_data[api] = data;
        }
    }
    Scratch.extensions.register(new FSL());
})(Scratch);
