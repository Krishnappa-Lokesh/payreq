jQuery.sap.require("sap.ui.qunit.qunit-css");
jQuery.sap.require("sap.ui.thirdparty.qunit");
jQuery.sap.require("sap.ui.qunit.qunit-junit");
QUnit.config.autostart = false;

// We cannot provide stable mock data out of the template.
// If you introduce mock data, by adding .json files in your webapp/localService/mockdata folder you have to provide the following minimum data:
// * At least 3 ET_FV60HeaderSet in the list

sap.ui.require([
	"sap/ui/test/Opa5",
	"appay/AP_PayRequest/test/integration/pages/Common",
	"sap/ui/test/opaQunit",
	"appay/AP_PayRequest/test/integration/pages/App",
	"appay/AP_PayRequest/test/integration/pages/Browser",
	"appay/AP_PayRequest/test/integration/pages/Master",
	"appay/AP_PayRequest/test/integration/pages/Detail",
	"appay/AP_PayRequest/test/integration/pages/Create",
	"appay/AP_PayRequest/test/integration/pages/NotFound"
], function (Opa5, Common) {
	"use strict";
	Opa5.extendConfig({
		arrangements: new Common(),
		viewNamespace: "appay.AP_PayRequest.view."
	});

	sap.ui.require([
		"appay/AP_PayRequest/test/integration/MasterJourney",
		"appay/AP_PayRequest/test/integration/NavigationJourney",
		"appay/AP_PayRequest/test/integration/NotFoundJourney",
		"appay/AP_PayRequest/test/integration/BusyJourney",
		"appay/AP_PayRequest/test/integration/FLPIntegrationJourney"
	], function () {
		QUnit.start();
	});
});