module.exports = function (less) {

    var shortHandProperties = ["margin", "border-width", "padding", "border-radius", "border", "border-style"];
    var keywordProperties = ["float", "text-align"];

    function AutoRTLPlugin() {
        this._visitor = new less.visitors.Visitor(this);
    };

    function reverseKeyword(keywordNode, visitArgs) {
        if (visitArgs.reverseKeywords) {
            switch (keywordNode.value) {
                case "left":
                    return new less.tree.Keyword("right");
                case "right":
                    return new less.tree.Keyword("left");
            }
        }
        visitArgs.reverseKeywords = false;
        return keywordNode;
    }

    function createSelector(orginalSelector, selectorValues) {
        const element = orginalSelector.elements[0];
        const newElements = selectorValues.map(selectorValue => {
            return new less.tree.Element(new less.tree.Combinator(' '), selectorValue, element._index, element._fileInfo, element.nodeVisible)
        });
        return new less.tree.Selector(newElements, orginalSelector.extendList, orginalSelector.condition, orginalSelector._index,
            orginalSelector._fileInfo, orginalSelector.nodeVisible);
    }

    function cloneDeclaration(orginal, newName, value) {
        return new less.tree.Declaration(
            newName,
            value ? value : orginal.value,
            orginal.important,
            orginal.merge,
            orginal._index,
            orginal._fileInfo,
            orginal.inline,
            orginal.variable);
    }

    function createRuleset(rulesetNode, rulesLtr, rulesRtl, nonRtlRules) {
        // order is important. rtl first, so that ltr rules can overwrite them
        var directionRulesets = [
            { direction: "rtl", rules: rulesRtl },
            { direction: 'ltr', rules: rulesLtr }]
            .filter(rulesWrapper => rulesWrapper.rules.length > 0);

        directionRulesets = directionRulesets.map(rulesWrapper => {
            var selectorDefinition = [
                ['[dir="' + rulesWrapper.direction + '"]', '&'],
                [':host-context([dir="' + rulesWrapper.direction + '"])', '&']
            ];

            const selectors = selectorDefinition.map(selectorDefinition => createSelector(rulesetNode.selectors[0], selectorDefinition));
            var childRuleset = new less.tree.Ruleset(selectors,
                (rulesWrapper.direction == 'ltr') ? rulesLtr : rulesRtl,
                rulesetNode.strictImports,
                rulesetNode.visibilityInfo());
            childRuleset.processed = true;
            return childRuleset;
        });

        rulesetNode.rules = [...directionRulesets, ...nonRtlRules];
        return rulesetNode;
    }

    function splitRules(rules, visitArgs, visitor) {
        var [rulesets, declarationRules] = separateRulesets(rules);
        var [ltrRules, rtlRules, nonRtlRules] = separateDeclarationRules(declarationRules, visitArgs, visitor);

        ltrRules = filterInitialRules(ltrRules);
        rtlRules = filterInitialRules(rtlRules);
        visitArgs.direction = null;
        return [ltrRules, rtlRules, nonRtlRules, rulesets];
    }

    function filterInitialRules(rules) {
        return rules.filter(rule => {
            const hasRule = rules.some(current =>
                current.name[0].value == rule.name[0].value &&
                current.value.value[0].value != 'initial');

            return rule.value.value[0].value != 'initial' || !hasRule;
        });
    }

    function separateRulesets(rules) {
        var declarationRules = [];
        const rulesets = rules.filter(rule => {
            if (rule.type == "Declaration") {
                declarationRules.push(rule);
                return false;
            } else {
                return true;
            }
        });
        return [rulesets, declarationRules];
    }

    function negateTranslation(valueNode, visitArgs) {
        switch (valueNode.type) {
            case 'Dimension':
                return new less.tree.Dimension(valueNode.value * -1, valueNode.unit)
            case 'Variable':
                return new less.tree.Negative(valueNode);
            case 'Negative':
                return valueNode.value;
            case 'Operation':
                return new less.tree.Negative(valueNode);
        }
        visitArgs.negateTranslation = false;
        return valueNode;
    }

    function separateDeclarationRules(declarationRules, visitArgs, visitor) {
        var ltrRules = [],
            rtlRules = [],
            nonRtlRules = [];

        declarationRules.forEach(rule => {
            const ruleRtl = cloneDeclaration(rule, rule.name);
            visitArgs.direction = "RTL";
            const newRuleRtl = visitor.visit(ruleRtl);
            if (visitArgs.doRemove || visitArgs.shortHandReorder || visitArgs.reverseValues || visitArgs.reverseKeywords || visitArgs.specific || visitArgs.negateTranslation) {

                if (visitArgs.reverseValues) {
                    const initialLtrRule = cloneDeclaration(rule, newRuleRtl.name, 'initial');
                    ltrRules.push(initialLtrRule);
                    const initialRtlRule = cloneDeclaration(rule, rule.name, 'initial');
                    rtlRules.push(initialRtlRule);
                }

                const ruleLtr = cloneDeclaration(rule, rule.name);
                visitArgs.direction = "LTR";
                const newRuleLtr = visitor.visit(ruleLtr);

                newRuleLtr && ltrRules.push(newRuleLtr);
                newRuleRtl && rtlRules.push(newRuleRtl);
                newRuleLtr && nonRtlRules.push(newRuleLtr);
            } else {
                nonRtlRules.push(newRuleRtl);
            }
        });
        return [ltrRules, rtlRules, nonRtlRules];
    }

    AutoRTLPlugin.prototype = {
        isReplacing: true,
        isPreEvalVisitor: true,
        run: function (root) {
            return this._visitor.visit(root);
        },
        visitDeclaration: function (ruleNode, visitArgs) {
            var nodeName = ruleNode.name[0].value,
                match = "";

            visitArgs.shortHandReorder = false;
            visitArgs.reverseKeywords = false;
            visitArgs.reverseValues = false;
            visitArgs.doRemove = false;
            visitArgs.specific = false;
            visitArgs.negateTranslation = false;

            doReverse = visitArgs.direction === "RTL";

            if (ruleNode.variable || !visitArgs.direction || !nodeName) {
                return ruleNode;
            }

            if (match = nodeName.match(/^(-rtl-ltr-|-ltr-rtl-)(.*)$/)) {
                doReverse = false;
                nodeName = match[2];
            } else if (match = nodeName.match(/^-ltr-(.*)$/)) {
                visitArgs.doRemove = visitArgs.direction === "RTL";
                visitArgs.specific = visitArgs.direction === "LTR";
                nodeName = match[1];
            } else if (match = nodeName.match(/^-rtl-(.*)$/)) {
                visitArgs.doRemove = visitArgs.direction === "LTR";
                visitArgs.specific = visitArgs.direction === "RTL";
                doReverse = false;
                nodeName = match[1];
            }

            if (visitArgs.doRemove) {
                return;
            }

            if (doReverse && nodeName.match(/(.*)(transform)(.*)/)) {
                visitArgs.negateTranslation = true;
            }

            if (doReverse && nodeName.match(/(^|-)(left|right)($|-)/)) {
                visitArgs.reverseValues = true;
                nodeName = nodeName.replace(/(^|-)(left|right)($|-)/, function (allOfMatch, leftPart, replacePart, rightPart) {
                    replacePart = (replacePart === "left") ? "right" : "left";
                    return leftPart + replacePart + rightPart;
                });
            }
            if (doReverse && keywordProperties.indexOf(nodeName) >= 0) {
                visitArgs.reverseKeywords = true;
            }
            if (doReverse && shortHandProperties.indexOf(nodeName) >= 0) {
                visitArgs.shortHandReorder = true;
            }

            if (nodeName !== ruleNode.name[0].value) {
                return cloneDeclaration(ruleNode, [new less.tree.Keyword(nodeName)]);
            }

            return ruleNode;
        },
        visitValue(valueNode, visitArgs) {
            if (visitArgs.shortHandReorder) {
                visitArgs.visitExpression = true;
                const expression = this._visitor.visitArray(valueNode.value);
                visitArgs.visitExpression = false;
                if (visitArgs.shortHandReorder) {
                    return new less.tree.Value([expression]);
                }
            }
            return visitArgs.negateTranslation ? new less.tree.Value(valueNode.value) : valueNode;
        },
        visitExpression: function (expressionNode, visitArgs) {
            if (expressionNode.value.length == 1 && expressionNode.value[0].type == "Variable") {
                visitArgs.reverseKeywords = false;
            } else if (visitArgs.visitExpression && expressionNode.value.length == 4 && expressionNode.value[1] != expressionNode.value[3]) {
                return new less.tree.Expression([expressionNode.value[0], expressionNode.value[3], expressionNode.value[2], expressionNode.value[1]]);
            }

            visitArgs.shortHandReorder = false;
            return visitArgs.negateTranslation ? new less.tree.Expression(expressionNode.value) : expressionNode;
        },
        visitCall(callNode, visitArgs) {
            if (visitArgs.direction == 'RTL' && (callNode.name == 'translate' || callNode.name == 'translateX')) {
                var newArgs = callNode.args.slice();
                newArgs[0] = negateTranslation(newArgs[0], visitArgs);
                return new less.tree.Call(callNode.name, newArgs, callNode._index, callNode._fileInfo);
            }
            return callNode;
        },
        visitAnonymous: function (valueNode, visitArgs) {
            const values = valueNode.value.split(' ');
            if (visitArgs.shortHandReorder && values.length === 4 && values[1] != values[3]) {
                return new less.tree.Anonymous(values[0] + " " + values[3] + " " + values[2] + " " + values[1]);
            }
            visitArgs.shortHandReorder = false;
            return reverseKeyword(valueNode, visitArgs);
        },
        visitMixinDefinition: function (node, visitArgs) {
            return this.visitRuleset(node, visitArgs);
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            if (rulesetNode.processed) {
                return rulesetNode;
            }

            [ltrRules, rtlRules, nonRtlRules, rulesets] = splitRules(rulesetNode.rules, visitArgs, this._visitor);

            return createRuleset(rulesetNode, ltrRules, rtlRules, [...nonRtlRules, ...rulesets]);
        },
    };
    return AutoRTLPlugin;
};