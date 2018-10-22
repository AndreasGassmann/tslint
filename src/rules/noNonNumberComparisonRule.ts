/**
 * @license
 * Copyright 2018 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { isBinaryExpression, isTypeFlagSet } from "tsutils";
import * as ts from "typescript";

import * as Lint from "../index";

const OPTION_ALLOW_EQUAL = "allow-equal";

interface Options {
    allowReferenceEquals: boolean;
}

export class Rule extends Lint.Rules.TypedRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "no-non-number-comparison",
        description: "Only allows comparisons between numbers.",
        optionsDescription: Lint.Utils.dedent`
            Only allow greater and less than comparisons between numbers. Checking equality on strings is also valid.

            One argument may be optionally provided:

            * \`"allow-equal"\` allows \`!=\` \`==\` \`!==\` \`===\` comparisons between any types.`,
        options: {
            type: "array",
            items: {
                type: "string",
                enum: [OPTION_ALLOW_EQUAL]
            },
            minLength: 0,
            maxLength: 1
        },
        optionExamples: [true, [true, OPTION_ALLOW_EQUAL]],
        type: "functionality",
        typescriptOnly: false,
        requiresTypeInfo: true
    };
    /* tslint:enable:object-literal-sort-keys */

    public static INVALID_COMPARISON = `Invalid comparison`;

    public applyWithProgram(sourceFile: ts.SourceFile, program: ts.Program): Lint.RuleFailure[] {
        return this.applyWithFunction(
            sourceFile,
            walk,
            {
                allowReferenceEquals: this.ruleArguments.indexOf(OPTION_ALLOW_EQUAL) !== -1
            },
            program
        );
    }
}

function walk(ctx: Lint.WalkContext<Options>, program: ts.Program) {
    const checker = program.getTypeChecker();

    return ts.forEachChild(ctx.sourceFile, function cb(node: ts.Node): void {
        if (
            isBinaryExpression(node) &&
            isComparisonOperator(node) &&
            !(isAnyType(node.right, checker) || isAnyType(node.left, checker)) &&
            !(isNumericType(node.right, checker) || isNumericType(node.left, checker)) &&
            !(
                isEqualityOperator(node) &&
                (isStringType(node.left, checker) || isStringType(node.right, checker))
            ) &&
            !(ctx.options.allowReferenceEquals && isEqualityOperator(node))
        ) {
            ctx.addFailureAtNode(node, Rule.INVALID_COMPARISON);
        }
        return ts.forEachChild(node, cb);
    });
}

function isComparisonOperator(node: ts.BinaryExpression): boolean {
    switch (node.operatorToken.kind) {
        case ts.SyntaxKind.LessThanToken:
        case ts.SyntaxKind.GreaterThanToken:
        case ts.SyntaxKind.LessThanEqualsToken:
        case ts.SyntaxKind.GreaterThanEqualsToken:
        case ts.SyntaxKind.EqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsToken:
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            return true;
        default:
            return false;
    }
}

function isEqualityOperator(node: ts.BinaryExpression): boolean {
    switch (node.operatorToken.kind) {
        case ts.SyntaxKind.EqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsToken:
        case ts.SyntaxKind.EqualsEqualsEqualsToken:
        case ts.SyntaxKind.ExclamationEqualsEqualsToken:
            return true;
        default:
            return false;
    }
}

function isAnyType(node: ts.Expression, checker: ts.TypeChecker) {
    return (
        node.kind === ts.SyntaxKind.AnyKeyword ||
        isTypeFlagSet(checker.getTypeAtLocation(node), ts.TypeFlags.Any)
    );
}

function isNumericType(node: ts.Expression, checker: ts.TypeChecker) {
    return (
        node.kind === ts.SyntaxKind.NumericLiteral ||
        isTypeFlagSet(checker.getTypeAtLocation(node), ts.TypeFlags.Number)
    );
}

function isStringType(node: ts.Expression, checker: ts.TypeChecker) {
    return (
        node.kind === ts.SyntaxKind.StringLiteral ||
        isTypeFlagSet(checker.getTypeAtLocation(node), ts.TypeFlags.String)
    );
}
