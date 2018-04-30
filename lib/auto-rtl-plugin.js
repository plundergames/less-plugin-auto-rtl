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
            visitArgs.overridenDirection = '';

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
                visitArgs.overridenDirection = 'LTR';
            } else if (match = nodeName.match(/^-rtl-(.*)$/)) {
                visitArgs.doRemove = visitArgs.direction === "LTR";
                visitArgs.specific = visitArgs.direction === "RTL";
                doReverse = false;
                nodeName = match[1];
                visitArgs.overridenDirection = 'RTL';
            }

            if (visitArgs.doRemove) {
                return;
            }

            if (!doReverse && !visitArgs.doRemove && nodeName === ruleNode.name[0].value) {
                return ruleNode;
            }

            if (doReverse && nodeName.match(/(^|-)(left|right)($|-)/)) {
                visitArgs.reverseValues = true;
                nodeName = nodeName.replace(/(^|-)(left|right)($|-)/, function (allOfMatch, leftPart, replacePart, rightPart) {
                    if (replacePart === "left") {
                        replacePart = "right";
                    } else {
                        replacePart = "left";
                    }
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
                return this.cloneDeclaration(ruleNode, [new less.tree.Keyword(nodeName)]);
            }

            return ruleNode;
        },
        visitExpression: function (expressionNode, visitArgs) {
            if (expressionNode.value.length == 1 && expressionNode.value[0].type == "Variable") {
                visitArgs.reverseKeywords = false;
            }
            return expressionNode;
        },
        visitAnonymous: function (valueNode, visitArgs) {
            const values = valueNode.value.split(' ');
            if (visitArgs.shortHandReorder && values.length === 4 && values[1] != values[3]) {
                var result = new less.tree.Anonymous(values[0] + " " + values[3] + " " + values[2] + " " + values[1]);
                return result;
            }
            visitArgs.shortHandReorder = false;
            return reverseKeyword(valueNode, visitArgs);
        },
        cloneDeclaration: function (orginal, newName) {
            return new less.tree.Declaration(
                newName,
                orginal.value,
                orginal.important,
                orginal.merge,
                orginal.index,
                orginal.currentFileInfo,
                orginal.inline,
                orginal.variable);
        },
        createSelector: function (orginalSelector, selectorValues) {
            const element = orginalSelector.elements[0];
            const newElements = selectorValues.map(selectorValue => {
                var combinator = selectorValue.combinator !== undefined ? new less.tree.Combinator(selectorValue.combinator) : new less.tree.Combinator(' ');
                var value = selectorValue.value !== undefined ? selectorValue.value : selectorValue;
                return new less.tree.Element(combinator, value, element._index, element._fileInfo, element.nodeVisible)
            });
            return new less.tree.Selector(newElements, orginalSelector.extendList, orginalSelector.condition, orginalSelector._index,
                orginalSelector._fileInfo, orginalSelector.nodeVisible);
        },
        visitMixinDefinition: function (node, visitArgs) {
            return this.visitRuleset(node, visitArgs);
        },
        visitVariable: function (node, visitArgs) {
            return node;
        },
        splitRules: function (rules, visitArgs) {
            var ltrRules = [],
                rtlRules = [],
                declarationRules = [],
                nonRtlRules = [];

            const rulesets = rules
                .filter(rule => {
                    if (rule.type == "Declaration") {
                        declarationRules.push(rule);
                        return false;
                    } else {
                        return true;
                    }
                });
            declarationRules.forEach(rule => {
                const ruleRtl = this.cloneDeclaration(rule, rule.name);
                visitArgs.direction = "RTL";
                const newRuleRtl = this._visitor.visit(ruleRtl);
                if (visitArgs.doRemove || visitArgs.shortHandReorder || visitArgs.reverseValues || visitArgs.reverseKeywords || visitArgs.specific) {
                    const ruleLtr = this.cloneDeclaration(rule, rule.name);
                    visitArgs.direction = "LTR";
                    const newRuleLtr = this._visitor.visit(ruleLtr);
                    ltrRules.push(newRuleLtr);
                    rtlRules.push(newRuleRtl);
                } else {
                    if (visitArgs.overridenDirection == 'RTL') {
                        rtlRules.push(newRuleRtl);
                    } else if (visitArgs.overridenDirection == 'LTR') {
                        ltrRules.push(newRuleLtr);
                    }
                    nonRtlRules.push(newRuleRtl);
                }
            });
            visitArgs.direction = null;
            return [ltrRules, rtlRules, nonRtlRules, rulesets];
        },
        createRuleset: function (rulesetNode, rulesLtr, rulesRtl, nonRtlRules) {
            var directionRulesets = [{ direction: "ltr", rules: rulesLtr }, { direction: 'rtl', rules: rulesRtl }].filter(rulesWrapper => rulesWrapper.rules.length > 0);
            directionRulesets = directionRulesets.map(rulesWrapper => {
                var selectorDefinition = [
                    ['[dir="' + rulesWrapper.direction + '"]', '&'],
                    [':host-context([dir="' + rulesWrapper.direction + '"])', {value:'&',combinator:''}]
                ];

                var nonRtlSelectorDefinition = [
                    ['[dir="rtl"]', '[no-rtl]', '&'],
                    [':host-context([dir="rtl"])', {value:'[no-rtl]',combinator:''}, '&'],
                    [':host-context([dir="rtl"])', {value:':host-context([no-rtl])', combinator:''}, {value:'&',combinator:''}]
                ];

                selectorDefinition = (rulesWrapper.direction == 'ltr') ? [...selectorDefinition, ...nonRtlSelectorDefinition] : selectorDefinition;
                const selectors = selectorDefinition.map(selectorDefinition => this.createSelector(rulesetNode.selectors[0], selectorDefinition));
                var childRuleset = new less.tree.Ruleset(selectors,
                    (rulesWrapper.direction == 'ltr') ? rulesLtr : rulesRtl,
                    rulesetNode.strictImports,
                    rulesetNode.visibilityInfo());
                childRuleset.processed = true;
                return childRuleset;
            });

            rulesetNode.rules = [...directionRulesets, ...nonRtlRules];
            return rulesetNode;
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            if (rulesetNode.processed) {
                return rulesetNode;
            }

            [ltrRules, rtlRules, nonRtlRules, rulesets] = this.splitRules(rulesetNode.rules, visitArgs);

            return this.createRuleset(rulesetNode, ltrRules, rtlRules, [...nonRtlRules, ...rulesets]);
        },
    };
    return AutoRTLPlugin;
};