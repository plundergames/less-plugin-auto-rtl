var getAutoRTLPlugin = require("./auto-rtl-plugin");

function LessPluginAutoRTL(options) {
}

LessPluginAutoRTL.prototype = {
    install: function (less, pluginManager) {
        var AutoRTLPlugin = getAutoRTLPlugin(less);
        pluginManager.addVisitor(new AutoRTLPlugin(this.options));

    },
    printUsage: function () {
        console.log("Auto RTL Plugin");
    },
};

module.exports = LessPluginAutoRTL