jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

sap.ui.require([
	"sap/ui/test/Opa5",
	"appay/AP_PayRequest/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"appay/AP_PayRequest/test/integration/pages/App",
	"appay/AP_PayRequest/test/integration/pages/Browser",
	"appay/AP_PayRequest/test/integration/pages/Master",
	"appay/AP_PayRequest/test/integration/pages/Detail",
	"appay/AP_PayRequest/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "appay.AP_PayRequest.view."
	});

	sap.ui.require([
		"appay/AP_PayRequest/test/integration/NavigationJourneyPhone",
		"appay/AP_PayRequest/test/integration/NotFoundJourneyPhone",
		"appay/AP_PayRequest/test/integration/BusyJourneyPhone"
	], function () {
		QUnit.start();
	});
});