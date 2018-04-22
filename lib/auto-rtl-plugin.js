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
            var nodeName = ruleNode.name[0].value,
                match = "";

            visitArgs.shortHandReorder = false;
            visitArgs.reverseKeywords = false;
            visitArgs.reverseValues = false;
            visitArgs.doRemove = false;
            visitArgs.specific = false;
            visitArgs.overridenDirection = '';

            doReverse = (visitArgs.direction === "RTL" && (this._generalDirection == 'auto' || !this._generalDirection)) ? true : false;

            if (ruleNode.variable || !visitArgs.direction) {
                return ruleNode;
            }

            if (match = nodeName.match(/^-direction-auto/)) {
                this._generalDirection = 'auto';
                visitArgs.doRemove = true;
            } else if (match = nodeName.match(/^-direction(-rtl-ltr|-ltr-rtl)/)) {
                this._generalDirection = 'both';
                visitArgs.doRemove = true;
            } else if (match = nodeName.match(/^-direction-ltr/)) {
                this._generalDirection = 'ltr';
                visitArgs.doRemove = true;
            } else if (match = nodeName.match(/^-direction-rtl/)) {
                this._generalDirection = 'rtl';
                visitArgs.doRemove = true;
            } else if (match = nodeName.match(/^(-rtl-ltr-|-ltr-rtl-)(.*)$/)) {
                doReverse = false;
                nodeName = match[2];
            }
            else if (match = nodeName.match(/^-ltr-(.*)$/)) {
                visitArgs.doRemove = visitArgs.direction === "RTL";
                visitArgs.specific = visitArgs.direction === "LTR";
                nodeName = match[1];
                visitArgs.overridenDirection = 'LTR';
            }
            else if (match = nodeName.match(/^-rtl-(.*)$/)) {
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
                return this.cloneDeclaration(ruleNode, nodeName);
            }

            return ruleNode;
        },
        visitAnonymous: function (valueNode, visitArgs) {
            const values = valueNode.value.split(' ');
            if (visitArgs.shortHandReorder && values.length === 4) {
                var result = new less.tree.Anonymous(values[0] + " " + values[3] + " " + values[2] + " " + values[1]);
                return result;
            }
            return reverseKeyword(visitArgs.reverseKeywords, valueNode);
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
        createSelector: function (selector, ...selectorValues) {
            const element = selector.elements[0];
            const newElements = selectorValues.map(selectorValue => {
                var combinator = (selectorValue == ',') ? new less.tree.Combinator('') : new less.tree.Combinator(' ');
                return new less.tree.Element(combinator, selectorValue, 0, element.currentFileInfo, element.visibilityInfo)
            });
            return new less.tree.Selector(newElements, selector.extendList, selector.condition, selector.index, selector.currentFileInfo, selector.visibilityInfo);
        },
        splitRules: function (rules, visitArgs) {
            var newRulesLtr = [],
                newRulesRtl = [],
                declarationRules = [],
                nonRtlRules = [];

            const rulesets = rules
                .filter(rule => {
                    if (rule.name && rule.name[0] && rule.name[0].value) {
                        declarationRules.push(rule);
                        return false;
                    } else {
                        return true;
                    }
                });
            declarationRules.forEach(rule => {
                const ruleRtl = this.cloneDeclaration(rule, rule.name[0].value);
                visitArgs.direction = "RTL";
                const newRuleRtl = this._visitor.visit(ruleRtl);
                if (visitArgs.doRemove || visitArgs.shortHandReorder || visitArgs.reverseValues || visitArgs.reverseKeywords || visitArgs.specific) {
                    const ruleLtr = this.cloneDeclaration(rule, rule.name[0].value);
                    visitArgs.direction = "LTR";
                    const newRuleLtr = this._visitor.visit(ruleLtr);
                    newRulesLtr.push(newRuleLtr);
                    newRulesRtl.push(newRuleRtl);
                } else {
                    if (visitArgs.overridenDirection == 'RTL') {
                        newRulesRtl.push(newRuleRtl);
                    } else if (visitArgs.overridenDirection == 'LTR') {
                        newRulesLtr.push(newRulesLtr);
                    }
                    nonRtlRules.push(newRuleRtl);
                }
            });
            return [newRulesLtr, newRulesRtl, nonRtlRules, rulesets];
        },
        createRuleset: function (rulesetNode, rulesLtr, rulesRtl, nonRtlRules, parentDirection) {
            if (rulesLtr.length == 0 && rulesRtl.length == 0) {
                rulesetNode.rules = nonRtlRules;
                return rulesetNode;
            }
            var directionRulesets = [{ direction: "ltr", rules: rulesLtr }, { direction: 'rtl', rules: rulesRtl }].filter(rulesWrapper => rulesWrapper.rules.length > 0);
            directionRulesets = directionRulesets.map(rulesWrapper => {
                const selector = this.createSelector(rulesetNode.selectors[0],
                    '[dir="' + rulesWrapper.direction + '"]', '&', ',',
                    ':host-context([dir="' + rulesWrapper.direction + '"])', '&');
                var childRuleset = new less.tree.Ruleset([selector],
                    (rulesWrapper.direction == 'ltr') ? rulesLtr : rulesRtl,
                    rulesetNode.strictImports,
                    rulesetNode.visibilityInfo());
                childRuleset.processed = true;
                return childRuleset;
            });
            nonRtlRules.forEach(element => element.processed = true);
            var newRuleset = new less.tree.Ruleset(rulesetNode.selectors, [...directionRulesets, ...nonRtlRules], rulesetNode.strictImports, rulesetNode.visibilityInfo());
            newRuleset.parentDirection = parentDirection;
            return newRuleset;
        },
        visitRuleset: function (rulesetNode, visitArgs) {
            var parentDirection = this._generalDirection;
            rulesetNode.parentDirection = parentDirection;
            if (rulesetNode.processed) {
                visitArgs.direction = null;
                return rulesetNode;
            }

            [newRulesLtr, newRulesRtl, nonRtlRules, rulesets] = this.splitRules(rulesetNode.rules, visitArgs);

            visitArgs.direction = null;
            switch (this._generalDirection) {
                case 'ltr':
                    return this.createRuleset(rulesetNode, [...newRulesLtr, ...nonRtlRules], newRulesRtl, rulesets, parentDirection);
                case 'rtl':
                    return this.createRuleset(rulesetNode, newRulesLtr, [...newRulesRtl, ...nonRtlRules], rulesets, parentDirection);
                case 'both':
                case 'auto':
                default:
                    return this.createRuleset(rulesetNode, newRulesLtr, newRulesRtl, [...nonRtlRules, ...rulesets], parentDirection);
            }
        },

        visitRulesetOut: function (rulesetNode) {
            this._generalDirection = rulesetNode.parentDirection;
        },
    };
    return AutoRTLPlugin;
};