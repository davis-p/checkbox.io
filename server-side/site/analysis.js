var esprima = require("esprima");
var options = {tokens:true, tolerant: true, loc: true, range: true };
var fs = require("fs");
var glob = require("glob");

function main()
{


    glob("**/*.js", options, function (er, files) {

        files.forEach(function (file) {

            if(file.toString().indexOf("node_modules") === -1 && file.toString() !== "analysis.js")
            {
                complexity(file.toString());

                // Report
                for( var node in builders )
                {
                    var builder = builders[node];
                    builder.report();
                }

                builders={};
            }
        });

    });

}



var builders = {};

// Represent a reusable "class" following the Builder pattern.
function FunctionBuilder()
{
    this.StartLine = 0;
    this.FunctionName = "";
    this.LineCount = 0;
    // The number of parameters for functions
    this.ParameterCount  = 0,
        // Number of if statements/loops + 1
        this.SimpleCyclomaticComplexity = 0;
    // The max depth of scopes (nested ifs, loops, etc)
    this.MaxNestingDepth    = 0;
    // The max number of conditions if one decision statement.
    this.MaxConditions      = 0;
    this.bigOh = false;
    this.messageChain = 0;
    this.syncCalls = 0;


    this.report = function()
    {
        console.log(
            (
                "Function: {0}(): {1}\n" +
                "====================================\n" +
                "bigOh: {2}\t" +
                "messageChain: {3}\t" +
                "syncCalls: {4}\t" +
                "LineCount: {5} \n\n"
            )
                .format(this.FunctionName, this.StartLine,
                    this.bigOh, this.messageChain, this.syncCalls, this.LineCount)
        );
        if(this.LineCount > 200 || this.syncCalls > 1  || this.bigOh || this.messageChain > 3)
        {
            console.log("Code doesnot follow the guidelines linecount or syncalls messagechain or complexity");
            process.exit(1);
        }
    }

};

// A builder for storing file level information.
function FileBuilder()
{
    this.FileName = "";
    // Number of strings in a file.
    this.Strings = 0;
    // Number of imports in a file.
    this.ImportCount = 0;

    this.report = function()
    {
        console.log (
            ( "FILENAME: {0}\n" +
                "~~~~~~~~~~~~\n"+
                "ImportCount {1}\t" +
                "Strings {2}\n"
            ).format( this.FileName, this.ImportCount, this.Strings ));
    }
}

// A function following the Visitor pattern.
// Annotates nodes with parent objects.
function traverseWithParents(object, visitor)
{
    var key, child;
    visitor.call(null, object);

    for (key in object) {
        if (object.hasOwnProperty(key)) {
            child = object[key];
            if (typeof child === 'object' && child !== null && key != 'parent')
            {
                child.parent = object;
                traverseWithParents(child, visitor);
            }
        }
    }
}

function complexity(filePath)
{
    var buf = fs.readFileSync(filePath, "utf8");
    var ast = esprima.parse(buf, options);

    var i = 0;

    // A file level-builder:
    var fileBuilder = new FileBuilder();
    fileBuilder.FileName = filePath;
    fileBuilder.ImportCount = 0;
    builders[filePath] = fileBuilder;

    // Tranverse program with a function visitor.

    traverseWithParents(ast, function (node)
    {

        if (node.type === 'FunctionDeclaration')
        {
            var builder = new FunctionBuilder();

            builder.FunctionName = functionName(node);
            builder.StartLine    = node.loc.start.line;
            builder.LineCount = node.loc.end.line - node.loc.start.line;
            builder.MaxNestingDepth = childrenLength(node);
            builders[builder.FunctionName] = builder;

            traverseWithParents(node.body, function (firstnode) {
                if (firstnode.type !== undefined && (firstnode.type === 'ForStatement' || firstnode.type === 'ForInStatement' || firstnode.type === 'WhileStatement')) {
                    traverseWithParents(firstnode.body, function (secondnode) {
                        if (secondnode.type !== undefined && (secondnode.type === 'ForStatement' || secondnode.type === 'ForInStatement' || secondnode.type === 'WhileStatement')) {
                            traverseWithParents(secondnode.body, function (thirdnode) {
                                if (thirdnode !== undefined && thirdnode.type !== undefined && (thirdnode.type === 'ForStatement' || thirdnode.type === 'ForInStatement' || thirdnode.type === 'WhileStatement')) {
                                    builder.bigOh = true;
                                }
                            });
                        }
                    });
                }
                if (firstnode.type === 'MemberExpression')
                {
                    var messagechain = 0;
                    traverseWithParents(firstnode, function (children) {
                        if(children.type === 'MemberExpression')
                        {
                            messagechain++;
                        }
                    });
                    if(builder.messageChain < messagechain)
                    {
                        builder.messageChain = messagechain;
                    }
                }

                if (firstnode.type === 'CallExpression')
                {
                    traverseWithParents(firstnode, function (children) {
                        if(children.name != undefined && children.name.indexOf('Sync')> -1)
                        {
                            builder.syncCalls+=1;
                        }
                    });

                }

            });


        }




    });

}

// Helper function for counting children of node.
function childrenLength(node)
{
    var key, child;
    var count = 0;
    for (key in node)
    {

        if (node.hasOwnProperty(key))
        {
            child = node[key];
            if (typeof child === 'object' && child !== null && key != 'parent')
            {

                count++;
            }
        }
    }
    return count;
}


// Helper function for checking if a node is a "decision type node"
function isDecision(node)
{
    if( node.type == 'IfStatement' || node.type == 'ForStatement' || node.type == 'WhileStatement' ||
        node.type == 'ForInStatement' || node.type == 'DoWhileStatement')
    {
        return true;
    }
    return false;
}

// Helper function for printing out function name.
function functionName( node )
{
    if( node.id )
    {
        return node.id.name;
    }
    return "anon function @" + node.loc.start.line;
}

// Helper function for allowing parameterized formatting of strings.
if (!String.prototype.format) {
    String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}

main();

function Crazy (argument)
{

    var date_bits = element.value.match(/^(\d{4})\-(\d{1,2})\-(\d{1,2})$/);
    var new_date = null;
    if(date_bits && date_bits.length == 4 && parseInt(date_bits[2]) > 0 && parseInt(date_bits[3]) > 0)
        new_date = new Date(parseInt(date_bits[1]), parseInt(date_bits[2]) - 1, parseInt(date_bits[3]));

    var secs = bytes / 3500;

    if ( secs < 59 )
    {
        return secs.toString().split(".")[0] + " seconds";
    }
    else if ( secs > 59 && secs < 3600 )
    {
        var mints = secs / 60;
        var remainder = parseInt(secs.toString().split(".")[0]) -
            (parseInt(mints.toString().split(".")[0]) * 60);
        var szmin;
        if ( mints > 1 )
        {
            szmin = "minutes";
        }
        else
        {
            szmin = "minute";
        }
        return mints.toString().split(".")[0] + " " + szmin + " " +
            remainder.toString() + " seconds";
    }
    else
    {
        var mints = secs / 60;
        var hours = mints / 60;
        var remainders = parseInt(secs.toString().split(".")[0]) -
            (parseInt(mints.toString().split(".")[0]) * 60);
        var remainderm = parseInt(mints.toString().split(".")[0]) -
            (parseInt(hours.toString().split(".")[0]) * 60);
        var szmin;
        if ( remainderm > 1 )
        {
            szmin = "minutes";
        }
        else
        {
            szmin = "minute";
        }
        var szhr;
        if ( remainderm > 1 )
        {
            szhr = "hours";
        }
        else
        {
            szhr = "hour";
            for ( i = 0 ; i < cfield.value.length ; i++)
            {
                var n = cfield.value.substr(i,1);
                if ( n != 'a' && n != 'b' && n != 'c' && n != 'd'
                    && n != 'e' && n != 'f' && n != 'g' && n != 'h'
                    && n != 'i' && n != 'j' && n != 'k' && n != 'l'
                    && n != 'm' && n != 'n' && n != 'o' && n != 'p'
                    && n != 'q' && n != 'r' && n != 's' && n != 't'
                    && n != 'u' && n != 'v' && n != 'w' && n != 'x'
                    && n != 'y' && n != 'z'
                    && n != 'A' && n != 'B' && n != 'C' && n != 'D'
                    && n != 'E' && n != 'F' && n != 'G' && n != 'H'
                    && n != 'I' && n != 'J' && n != 'K' && n != 'L'
                    && n != 'M' && n != 'N' &&  n != 'O' && n != 'P'
                    && n != 'Q' && n != 'R' && n != 'S' && n != 'T'
                    && n != 'U' && n != 'V' && n != 'W' && n != 'X'
                    && n != 'Y' && n != 'Z'
                    && n != '0' && n != '1' && n != '2' && n != '3'
                    && n != '4' && n != '5' && n != '6' && n != '7'
                    && n != '8' && n != '9'
                    && n != '_' && n != '@' && n != '-' && n != '.' )
                {
                    window.alert("Only Alphanumeric are allowed.\nPlease re-enter the value.");
                    cfield.value = '';
                    cfield.focus();
                }
                cfield.value =  cfield.value.toUpperCase();
            }
            return;
        }
        return hours.toString().split(".")[0] + " " + szhr + " " +
            mints.toString().split(".")[0] + " " + szmin;
    }
}
exports.main = main;
