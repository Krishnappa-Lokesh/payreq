/*global history */
sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/m/MessagePopover",
	"sap/m/MessagePopoverItem",		
	"sap/ui/core/routing/History"
], function (Controller, MessagePopover, MessagePopoverItem, History) {
	"use strict";

	return Controller.extend("appay.AP_PayRequest.controller.BaseController", {
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler  for navigating back.
		 * It checks if there is a history entry. If yes, history.go(-1) will happen.
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {
				// Otherwise we go backwards with a forward history
				var bReplace = true;
				this.getRouter().navTo("master", {}, bReplace);
			}
		},


		
	
		onMessagePopoverPress: function (oEvent) {
			var oMessagesButton = oEvent.getSource();
			if (!this._messagePopover) {
				this._messagePopover = new MessagePopover({
					items: {
						path: "message>/",
						template: new MessagePopoverItem({
							description: "{message>description}",
							type: "{message>type}",
							title: "{message>message}"
						})
					}
				});
				oMessagesButton.addDependent(this._messagePopover);
			}
			this._messagePopover.toggle(oMessagesButton);
		},
		
		
		
		hideMaster: function (oEvent) {
			//@sap.ui.Button

			var oControl = this.getView().getParent().getParent();

			if (oEvent !== undefined) {
				var oSource = oEvent.getSource();

				if (oControl.getMode() === "ShowHideMode") {
					oControl.setMode(sap.m.SplitAppMode.HideMode);
					oSource.setIcon("sap-icon://exit-full-screen");
				} else {
					oControl.setMode(sap.m.SplitAppMode.ShowHideMode);
					oSource.setIcon("sap-icon://full-screen");
				}
			} else {
				if (oControl.getMode() === "ShowHideMode") {
					oControl.setMode(sap.m.SplitAppMode.HideMode);
					this.getView().byId("buttonFullScreen").setIcon("sap-icon://exit-full-screen");
				} else {
					oControl.setMode(sap.m.SplitAppMode.ShowHideMode);
					this.getView().byId("buttonFullScreen").setIcon("sap-icon://full-screen");
				}

			}

		}

	});

});