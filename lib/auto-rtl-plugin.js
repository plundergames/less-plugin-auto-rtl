module.exports = function (less) {

    var shortHandProperties = ["margin", "border-width", "padding", "border-radius", "border", "border-style"];
    var keywordProperties = ["float", "text-align"];

    function AutoRTLPlugin() {
        this._visitor = new less.visitors.Visitor(this);
    };

    function reverseKeyword(reverseKeywords, keywordNode) {
        if (reverseKeywords) {
            switch (keywordNode.value) {
                case "left":
                    return new less.tree.Keyword("right");
                case "right":
                    return new less.tree.Keyword("left");
            }
        }
        return keywordNode;
    }

    AutoRTLPlugin.prototype = {
        isReplacing: true,
        isPreEvalVisitor: true,
        run: function (root) {
            return this._visitor.visit(root);
        },
        visitDeclaration: function (ruleNode, visitArgs) {

            if (ruleNode.variable) {
                return ruleNode;
            }

            var nodeName = ruleNode.name[0].value,
                wantedDir = visitArgs.direction ? visitArgs.direction : "LTR",
                doReverse = wantedDir === "RTL" ? true : false,
                doRemove = false,
                match = "";

            if (match = nodeName.match(/^(-rtl-ltr-|-ltr-rtl-)(.*)$/)) {
                doReverse = false;
                nodeName = match[2];
            }
            else if (match = nodeName.match(/^-ltr-(.*)$/)) {
                doRemove = wantedDir === "RTL";
                nodeName = match[1];
            }
            else if (match = nodeName.match(/^-rtl-(.*)$/)) {
                doRemove = wantedDir === "LTR";
                doReverse = false;
                nodeName = match[1];
            }

            if (doRemove) {
                return;
            }

            if (!doReverse && !doRemove && nodeName === ruleNode.name) {
                return ruleNode;
            }

            if (doReverse && nodeName.match(/(^|-)(left|right)($|-)/)) {
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
                this._reverseKeywords = true;
            }
            else if (doReverse && shortHandProperties.indexOf(nodeName) >= 0) {
                this._shortHandReorder = true;
            }

            if (nodeName !== ruleNode.name) {
                return this.cloneDeclaration(ruleNode, nodeName);
            }

            return ruleNode;
        },
        visitAnonymous: function (valueNode, visitArgs) {
            const values = valueNode.value.split(' ');
            if (this._shortHandReorder && values.length === 4) {
                this._shortHandReorder = false;
                return new less.tree.Anonymous(values[0] + " " + values[3] + " " + values[2] + " " + values[1]);
            }
            return reverseKeyword(this._reverseKeywords, valueNode);
        },
        cloneDeclaration: function (orginal, newName) {
            return new less.tree.Declaration(
                [new less.tree.Keyword(newName)],
                orginal.value,
                orginal.important,
                orginal.merge,
                orginal.index,
                orginal.currentFileInfo,
                orginal.inline,
                orginal.variable);
        },
        cloneSelectors: function (orginal) {
            if (!orginal)
                return undefined;

            return orginal.map(selector => {
                const clonedElems = selector.elements.map(element => {
                    return new less.tree.Element(element.combinator, element.value, element.index, element.currentFileInfo, element.visibilityInfo);
                });
                return new less.tree.Selector(clonedElems, selector.extendList, selector.condition, selector.index, selector.currentFileInfo, selector.visibilityInfo);
            });
        },
        createSelector: function (selector, ...selectorValues) {
            const element = selector.elements[0]
            const newElements = selectorValues.map(selectorValue =>
                new less.tree.Element(element.combinator, selectorValue, element.index, element.currentFileInfo, element.visibilityInfo)
            );
            return new less.tree.Selector(newElements, selector.extendList, selector.condition, selector.index, selector.currentFileInfo, selector.visibilityInfo);
        },
        visitSelector: function (selectorNode, visitArgs) {
            console.log(selectorNode.elements);
            return selectorNode;
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            if (rulesetNode.direction == "RTL" || rulesetNode.direction == "LTR") {
                visitArgs.direction = rulesetNode.direction;
                return rulesetNode;
            }

            var oldRules = [];
            const newRulesLtr = rulesetNode.rules
                .filter(rule => {
                    if (rule.name && rule.name[0] && rule.name[0].value)
                        return true;
                    else
                        oldRules.push(rule);
                });

            const newRulesRtl = newRulesLtr.map(rule => this.cloneDeclaration(rule, rule.name[0].value));

            if (newRulesLtr.length > 0) {
                const ltrSelector = this.createSelector(rulesetNode.selectors[0], '[dir="ltr"]', '&', ',', ':host-context([dir="ltr"])', '&');
                const rtlSelector = this.createSelector(rulesetNode.selectors[0], '[dir="rtl"]', '&', ',', ':host-context([dir="rtl"])', '&');
                const newRulesetRtl = new less.tree.Ruleset([rtlSelector], newRulesRtl, rulesetNode.strictImports, rulesetNode.visibilityInfo());
                const newRulesetLtr = new less.tree.Ruleset([ltrSelector], newRulesLtr, rulesetNode.strictImports, rulesetNode.visibilityInfo());
                newRulesetRtl.direction = "RTL";
                newRulesetLtr.direction = "LTR";
                return new less.tree.Ruleset(rulesetNode.selectors, [newRulesetLtr, newRulesetRtl, ...oldRules], rulesetNode.strictImports, rulesetNode.visibilityInfo());
            } else {
                return rulesetNode;
            }
        },

        visitRulesetOut: function () {
        },
    };
    return AutoRTLPlugin;
};