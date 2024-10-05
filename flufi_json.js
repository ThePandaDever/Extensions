

(function(Scratch) {
    "use strict";

    var rep = "json";
    
    const {
        BlockType,
        ArgumentType
    } = Scratch;

    function formatFor(obj, representation) {
        if (representation === 'json') {
            return JSON.stringify(obj);
        }
        return obj;
    }
    
    class FJson {
        getInfo() {
            return {
                id: "fjson",
                name: "Flufi Json",
                color1: "#873dbf",
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
                        opcode: "isObjectValid",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [object] valid?",
                        arguments: {
                            object: { type: ArgumentType.STRING, defaultValue: '{}' },
                        }
                    },
                    {
                        opcode: "isObjectType",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [object] [type]?",
                        arguments: {
                            object: { type: ArgumentType.STRING, defaultValue: '{}' },
                            type: { type: ArgumentType.STRING, defaultValue: 'object', menu: 'JSONType' },
                        }
                    },
                    {
                        opcode: "isObjectRepresented",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "is [object] represented as [representation]?",
                        arguments: {
                            object: { type: ArgumentType.STRING, defaultValue: '{}' },
                            representation: { type: ArgumentType.STRING, defaultValue: 'object', menu: 'JSONRepresentation' },
                        }
                    },
                    "---",
                    {
                        opcode: "getPart",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "all [part] of [object]",
                        arguments: {
                            object: { type: ArgumentType.STRING, defaultValue: '{"key":"value","key2":"value2"}' },
                            part: { type: ArgumentType.STRING, defaultValue: 'keys', menu: 'JSONPart' },
                        }
                    },
                    {
                        opcode: "newObject",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "new [type]",
                        arguments: {
                            type: { type: ArgumentType.STRING, defaultValue: 'object', menu: 'JSONType' },
                        }
                    },
                    "---",
                    {
                        opcode: "containsKey",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "[object] contains key [key]",
                        arguments: {
                            object: { type: ArgumentType.STRING, defaultValue: '{"key":"value"}' },
                            key: { type: ArgumentType.STRING, defaultValue: 'key2' },
                        }
                    },
                ],
                menus: {
                    JSONType: {
                        acceptReporters: true,
                        items: [
                            {
                              text: 'Object',
                              value: 'object'
                            },
                            {
                              text: 'Array',
                              value: 'array'
                            }
                        ]
                    },
                    JSONRepresentation: {
                        acceptReporters: true,
                        items: [
                            {
                              text: 'JS Object',
                              value: 'object'
                            },
                            {
                              text: 'JSON',
                              value: 'json'
                            }
                        ]
                    },
                    JSONPart: {
                        acceptReporters: true,
                        items: [
                            "keys",
                            "values"
                        ]
                    }
                }
            };
        }
        
        isObjectValid({ object }) {
            if (typeof(object) === 'object') {
                return true;
            }
            if (typeof(object) === 'string') {
                try {
                    let v = JSON.parse(object);
                    return typeof(v) === 'object';
                } catch (e) {
                    return false;
                }
            }
            return false;
        }

        isObjectType({ object, type }) {
            if (typeof(object) === 'string') {
                try {
                    object = JSON.parse(object)
                } catch (e) {
                    return false;
                }
            }
            switch (type) {
                case "object":
                    return typeof(object) === 'object' && !Array.isArray(object)
                case "array":
                    return typeof(object) === 'object' && Array.isArray(object)
            }
            return false;
        }

        isObjectRepresented({ object, representation }) {
            let type = '';
            if (typeof(object) === 'string') {
                try {
                    let v = JSON.parse(object)
                    if (typeof(v) === 'object') {
                        type = 'json';
                    }
                } catch (e) {
                    return false;
                }
            }
            if (typeof(object) === 'object') {
                type = 'object';
            }
            return type === representation;
        }
        
        getPart({ object, part }) {
            if (typeof(object) === 'string') {
                try {
                    object = JSON.parse(object)
                } catch (e) {
                    return formatFor([],rep);
                }
            }
            if (typeof(object) === 'object') {
                switch (part) {
                    case "keys":
                        return formatFor(Object.keys(object),rep);
                    case "values":
                        return formatFor(Object.values(object),rep);
                }
            }
            return formatFor([],rep);
        }

        newObject({ type }) {
            switch (type) {
                case "object":
                    return formatFor({},rep);
                case "array":
                    return formatFor([],rep);
            }
            return "";
        }

        containsKey({ object, key }) {
            if (typeof(object) === 'string') {
                try {
                    object = JSON.parse(object)
                } catch (e) {
                    return false;
                }
            }
            if (typeof(object) === 'object') {
                if (Array.isArray(object)) {
                    return object.includes(key);
                } else {
                    
                }
            }
            return false;
        }
        
    }
    Scratch.extensions.register(new FJson());
})(Scratch);
