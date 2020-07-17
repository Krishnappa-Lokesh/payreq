sap.ui.define([
	"jquery.sap.global",
	"sap/m/ObjectMarker",
	"sap/m/MessageToast",
	"sap/m/UploadCollectionParameter",
	"sap/m/library",
	"sap/ui/core/format/FileSizeFormat",
	"sap/ui/Device",
	"appay/AP_PayRequest/controller/BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/m/MessageBox",
	"sap/ui/model/Filter",
	"sap/ui/model/FilterOperator"

], function (jQuery, ObjectMarker,
	MessageToast, UploadCollectionParameter,
	MobileLibrary, FileSizeFormat,
	Device, BaseController, JSONModel,
	MessageBox,
	Filter, FilterOperator
) {
	"use strict";

	return BaseController.extend("appay.AP_PayRequest.controller.CreateEntity", {

		_oBinding: {},

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			var that = this;

			this.getRouter().getTargets().getTarget("create").attachDisplay(null, this._onDisplay, this);
			this._oODataModel = this.getOwnerComponent().getModel();
			this._oAppViewModel = this.getModel("appView");
			this._oResourceBundle = this.getResourceBundle();
			this._oViewModel = new JSONModel({
				enableSave: true,
				delay: 0,
				busy: false,
				mode: "create",
				viewTitle: ""
			});
			this.setModel(this._oViewModel, "viewModel");

			// Line item table properties	
			var oTable = this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageItems", "lineItemsList"));
			this._oTable = oTable;
			this._oTableFilterState = {
				aFilter: [],
				aSearch: []
			};

			this._refreshModel = true;

			// Atttachement properties 
			var oAttachments = this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));
			this._oAttachments = oAttachments;

			this.getView().setModel(new JSONModel({
				"maximumFilenameLength": 55,
				"maximumFileSize": 1000,
				"mode": MobileLibrary.ListMode.SingleSelectMaster,
				"uploadEnabled": true,
				"uploadButtonVisible": true,
				"enableEdit": false,
				"enableDelete": false,
				"visibleEdit": false,
				"visibleDelete": false,
				"listSeparatorItems": [
					MobileLibrary.ListSeparators.All,
					MobileLibrary.ListSeparators.None
				],
				"showSeparators": MobileLibrary.ListSeparators.All,
				"listModeItems": [{
					"key": MobileLibrary.ListMode.SingleSelectMaster,
					"text": "Single"
				}, {
					"key": MobileLibrary.ListMode.MultiSelect,
					"text": "Multi"
				}]
			}), "attachSettings");

			// Atttachement - Allowed file types
			this.getView().setModel(new JSONModel({
				"items": ["pdf"],
				"selected": ["pdf"]

				//"items": ["jpg", "txt", "ppt", "doc", "xls", "pdf", "png"],
				//"selected": ["jpg", "txt", "ppt", "doc", "xls", "pdf", "png"]
			}), "fileTypes");

			// Sets the text to the label
			this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection")).addEventDelegate({
				onBeforeRendering: function () {
					this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "attachmentTitle")).setText(this.getAttachmentTitleText());
				}.bind(this)
			});

			// Register the view with the message manager
			sap.ui.getCore().getMessageManager().registerObject(this.getView(), true);
			var oMessagesModel = sap.ui.getCore().getMessageManager().getMessageModel();
			this._oBinding = new sap.ui.model.Binding(oMessagesModel, "/", oMessagesModel.getContext("/"));
			this._oBinding.attachChange(function (oEvent) {
				var aMessages = oEvent.getSource().getModel().getData();
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						that._oViewModel.setProperty("/enableSave", false);
					}
				}
			});
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Handles the onDisplay event which is triggered when this view is displayed 
		 * @param {sap.ui.base.Event} oEvent the on display event
		 * @private
		 */
		_onDisplay: function (oEvent) {
			var oData = oEvent.getParameter("data");
			if (oData && oData.mode === "update") {
				this._onEdit(oEvent);
			} else {
				this._onCreate(oEvent);
			}
		},

		/**
		-----------------------------------------------------------------------
		 * Prepares the view for creating new object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		-----------------------------------------------------------------------
		 */
		_onCreate: function (oEvent) {
			if (oEvent.getParameter("name") && oEvent.getParameter("name") !== "create") {
				this._oViewModel.setProperty("/enableSave", false);
				this.getRouter().getTargets().detachDisplay(null, this._onDisplay, this);
				this.getView().unbindObject();
				return;
			}
			//this.hideMaster();

			this._refreshModel = true;

			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("createViewTitle"));

			// Derive the Fiscal Year from calendar date
			var sDate = new Date();
			var sGjahr;
			if (sDate.getMonth() + 1 >= 7) {
				sGjahr = (sDate.getFullYear() + 1).toString();
			} else {
				sGjahr = sDate.getFullYear().toString();
			}

			var initialDate = new Date();
			var newRequestData = {
				Bukrs: 'JHEN',
				Belnr: '9999999999',
				Gjahr: sGjahr, // '2020',
				Bldat: initialDate,
				Budat: initialDate,
				Cpudt: initialDate,
				Aedat: initialDate,
				Upddt: initialDate
			};

			var oContext = this._oODataModel.createEntry(
				"ET_FV60HeaderSet", {
					properties: newRequestData,
					success: this._fnItemCreated.bind(this),
					error: this._fnItemCreationFailed.bind(this)
				});

			this.getView().setBindingContext(oContext);

			var oAppViewModel = this.getModel("appView");
			oAppViewModel.setProperty("/mode", "edit");
			oAppViewModel.setProperty("/itemAddButtonEnabled", false);
			oAppViewModel.setProperty("/costObjectDerived", false); // Enables Category 
			oAppViewModel.setProperty("/cancelButtonPressed", false);

			oAppViewModel.setProperty("/itemToSelect", oContext.getPath());
			this.getOwnerComponent().oListSelector.selectAListItem(oContext.getPath());

			this._oViewModel.setProperty("/enableSave", false);

		},

		/**
		-----------------------------------------------------------------------
		 * Prepares the view for editing the selected object
		 * @param {sap.ui.base.Event} oEvent the  display event
		 * @private
		-----------------------------------------------------------------------

		 */
		_onEdit: function (oEvent) {
			var oData = oEvent.getParameter("data"),
				oView = this.getView();

			this._oViewModel.setProperty("/enableSave", true);
			this._oViewModel.setProperty("/viewTitle", this._oResourceBundle.getText("editViewTitle"));

			this.getModel("appView").setProperty("/mode", "edit");
			this.getModel("appView").setProperty("/cancelButtonPressed", false);

			oView.bindElement({
				path: oData.objectPath
			});

			var oAppViewModel = this.getModel("appView");
			oAppViewModel.setProperty("/itemToSelect", oData.objectPath);
			this.getOwnerComponent().oListSelector.selectAListItem(oData.objectPath);

			if (oView.getBindingContext().getPath() !== undefined) {
				var oUploadCollection = this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));
				var oModel = oView.getModel();
				var sServiceUrl = oModel.sServiceUrl;
				var sPath = oView.getBindingContext().getPath();
				var endUrl = oUploadCollection.mBindingInfos.items.path; //"/to_attach"
				var uploadUrl = sServiceUrl + sPath + '/' + endUrl;

				oUploadCollection.setUploadUrl(uploadUrl);
			}

			//this._validateSaveEnablement();

		},

		onModeChange: function (oEvent) {
			var oSettingsModel = this.getView().getModel("settings");
			if (oEvent.getParameters().selectedItem.getProperty("key") === MobileLibrary.ListMode.MultiSelect) {
				oSettingsModel.setProperty("/visibleEdit", false);
				oSettingsModel.setProperty("/visibleDelete", false);
				this.enableToolbarItems(true);
			} else {
				oSettingsModel.setProperty("/visibleEdit", true);
				oSettingsModel.setProperty("/visibleDelete", true);
				this.enableToolbarItems(false);
			}
		},

		enableToolbarItems: function (status) {
			this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "selectAllButton")).setVisible(status);
			this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "deleteSelectedButton")).setVisible(status);
			this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "selectAllButton")).setEnabled(status);
			// This is only enabled if there is a selected item in multi-selection mode
			if (this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection")).getSelectedItems().length > 0) {
				this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "deleteSelectedButton")).setEnabled(true);
			}
		},

		/*
		-----------------------------------------------------------------------
		Header Category Events 
		-----------------------------------------------------------------------
		*/

		onCategoryInitialised: function (oEvent) {
			//var oSource = oEvent.getSource();
		},

		onCategoryInnerControlCreated: function (oEvent) {
			//var oSource = oEvent.getSource();
			//var oControl = oEvent.getSource().getInnerControls().pop();

		},

		onCategoryValueListChanged: function (oEvent) {
			//var oSource = oEvent.getSource();
			//var oControl = oEvent.getSource().getInnerControls().pop();

			var sPath = this.getView().getBindingContext().sPath;
			this._oODataModel.setProperty(sPath + "/Rstgr", oEvent.getParameters().changes.Rstgr);
			//this._oODataModel.setProperty(sPath + "/ZuiEventCd", "C"); // Category added 

			var oData = this._oODataModel.getData(sPath);

			//sap.ui.getCore().getMessageManager().removeAllMessages();

			var oChildContext = this._oODataModel.createEntry("ET_FV60ItemSet", {
				properties: {
					Bukrs: oData.Bukrs,
					Belnr: oData.Belnr,
					Gjahr: oData.Gjahr,
					Bzkey: '999',
					Rstgr: oData.Rstgr
				},
				success: this._fnItemCreated.bind(this),
				error: this._fnItemCreationFailed.bind(this),
				oContext: sPath
			});

			// Submit changes
			this._oODataModel.submitChanges();
			this._oODataModel.deleteCreatedEntry(oChildContext);

		},

		/*  Category value changed / selected 
		 */
		onCategoryChanged: function (oEvent) {

			//var sPath = this.getView().getBindingContext().sPath;
			//var oData = this._oODataModel.getData(sPath);

			sap.ui.getCore().getMessageManager().removeAllMessages();

			if (oEvent.getParameters().validated === undefined) {
				var sId = oEvent.getParameters().id;
				this.getView().byId(sId).setValueState("Error");
				this.getView().byId(sId).setValueStateText("Please select value from list");
				this.getView().byId(sId).focus();
				return;
			}
		},

		/*
		-----------------------------------------------------------------------
		Header BLdat Events 
		-----------------------------------------------------------------------
		*/
		onBldatInitialised: function (oEvent) {
			//var oSource = oEvent.getSource();
		},

		onBldatInnerControlCreated: function (oEvent) {
			var oSource = oEvent.getSource();
			var oControl = oSource.getInnerControls().pop();

			//var initialDate = new Date();

			//if (this.getView().getBindingContext() !== undefined &&
			//	this.getView().getBindingContext().getObject().Belnr === "9999999999"  &&
			//	oControl.getMetadata().getElementName().search("DatePicker") > 0) {
			//oControl.setMinDate(initialDate);
			//oControl.setMaxDate(initialDate);
			//}
		},

		/*
		-----------------------------------------------------------------------
		Vendor address 
		-----------------------------------------------------------------------
		*/

		/*  Vendor Change  START
		 */

		onVendorValueListChanged: function (oEvent) {

			// Submit changes
			this._oODataModel.submitChanges();

		},

		onVendorChanged: function (oEvent) {

			sap.ui.getCore().getMessageManager().removeAllMessages();

			// if (oEvent.getParameters().validated === undefined) {
			// 	var sId = oEvent.getParameters().id;
			// 	this.getView().byId(sId).setValueState("Error");
			// 	this.getView().byId(sId).setValueStateText("Please select value from list");
			// 	this.getView().byId(sId).focus();
			// 	return;
			// }

			// Submit changes
			this._oODataModel.submitChanges();

		},

		/*  Vendor Change END 
		 */

		/*
		-----------------------------------------------------------------------
		Line items update event  
		-----------------------------------------------------------------------
		*/
		onListUpdateFinished: function (oEvent) {
			//var oSource = oEvent.getSource();

			//-- Check if item table has atleast one line
			this.getModel("appView").setProperty("/costObjectDerived", false);
			var aItems = oEvent.getSource().getItems();
			if (aItems !== undefined && aItems.length > 0) {
				var aItemCells = aItems[0].getCells();
				for (var itemIndex in aItemCells) {
					if (aItemCells[itemIndex].getId().search('CostObj') > 0 &&
						aItemCells[itemIndex].getValue() !== "") {
						this.getModel("appView").setProperty("/costObjectDerived", true);
					}
				}

				// if (oEvent.getSource().getItems()[0].getCells()[2].getValue() !== "") {
				// 	this.getModel("appView").setProperty("/costObjectDerived", true);
				// }
			}
			this._itemsValidateSaveEnablement();
		},

		/*
		-----------------------------------------------------------------------
		Add New Line items  
		-----------------------------------------------------------------------
		*/
		onItemAddPress: function (oEvent) {

			var sPath = this.getView().getBindingContext().sPath;
			var oData = this._oODataModel.getData(sPath);

			//var oContext = this.getView().getBindingContext();
			//var sItemsPath = sPath + "/to_item";
			//var oAppViewModel = this.getModel("appView");
			//var oView = this.getView("viewModel");

			sap.ui.getCore().getMessageManager().removeAllMessages();

			var oChildContext = this._oODataModel.createEntry("ET_FV60ItemSet", {
				properties: {
					Bukrs: oData.Bukrs,
					Belnr: oData.Belnr,
					Gjahr: oData.Gjahr,
					Bzkey: '998'
				},
				success: this._fnItemCreated.bind(this),
				error: this._fnItemCreationFailed.bind(this),
				oContext: sPath
			});

			//var oReasonCode = this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageHeader","Rstgr_id"));
			//var sReasonCode = oReasonCode.getValue();

			this._oTableFilterState.aSearch = [new Filter("Rstgr", FilterOperator.EQ, "'" + oData.Rstgr + "'")];

			var aFilters = this._oTableFilterState.aSearch.concat(this._oTableFilterState.aFilter);
			this._oTable.getBinding("items").filter(aFilters, "Application");
			this._refreshModel = false;

			this._oODataModel.submitChanges();
			this._oODataModel.deleteCreatedEntry(oChildContext);

			this.getModel("appView").setProperty("/itemAddButtonEnabled", false);

		},

		/*
		-----------------------------------------------------------------------
		Delete Line items  
		-----------------------------------------------------------------------
		*/
		onItemDeletePress: function (oEvent) {
			var
				sPath = oEvent.getSource().getBindingContext().getPath(),
				sObjectHeader = this._oODataModel.getProperty(sPath + "/Bzkey"),
				sQuestion = this._oResourceBundle.getText("deleteLineItemText", sObjectHeader),
				sSuccessMessage = this._oResourceBundle.getText("deleteLineItemSuccess", sObjectHeader);

			var fnMyAfterDeleted = function () {
				MessageToast.show(sSuccessMessage);
				//oViewModel.setProperty("/busy", false);
				// Refresh table entries ...
			};
			this._confirmLineItemDeletionByUser({
				question: sQuestion
			}, [sPath], fnMyAfterDeleted);

		},

		_confirmLineItemDeletionByUser: function (oConfirmation, aPaths, fnAfterDeleted, fnDeleteCanceled, fnDeleteConfirmed) {
			/* eslint-enable */
			// Callback function for when the user decides to perform the deletion
			var fnLineItemDelete = function () {
				// Calls the oData Delete service
				this._callLineItemDelete(aPaths, fnAfterDeleted);
			}.bind(this);

			// Opens the confirmation dialog
			MessageBox.show(oConfirmation.question, {
				icon: oConfirmation.icon || MessageBox.Icon.WARNING,
				title: oConfirmation.title || this._oResourceBundle.getText("delete"),
				actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						fnLineItemDelete();
					} else if (fnDeleteCanceled) {
						fnDeleteCanceled();
					}
				}
			});
		},

		_callLineItemDelete: function (aPaths, fnAfterDeleted) {
			//var oViewModel = this.getModel("detailView");
			//oViewModel.setProperty("/busy", true);
			var fnFailed = function () {
				this._oODataModel.setUseBatch(true);
			}.bind(this);
			var fnSuccess = function () {
				if (fnAfterDeleted) {
					fnAfterDeleted();
					this._oODataModel.setUseBatch(true);
				}
				//oViewModel.setProperty("/busy", false);
			}.bind(this);
			return this._deleteLineItemRecord(aPaths[0], fnSuccess, fnFailed);
		},

		_deleteLineItemRecord: function (sPath, fnSuccess, fnFailed) {
			var oPromise = new Promise(function (fnResolve, fnReject) {
				this._oODataModel.setUseBatch(false);
				this._oODataModel.remove(sPath, {
					success: fnResolve,
					error: fnReject,
					async: true
				});
			}.bind(this));
			oPromise.then(fnSuccess, fnFailed);
			return oPromise;
		},

		/*
		-----------------------------------------------------------------------
		Cost Object type  
		---false----------------------------------------------------------------
		*/
		onItemCostObjTypChange: function (oEvent) {

			//	var sPath = this.getView().getBindingContext().getPath();
			//	var oData = this._oODataModel.getData(sPath);

			var sItemPath = oEvent.getSource().getBindingContext().getPath();

			// var oItemData = this._oODataModel.getData(sItemPath);

			// Clear out when Co Type is changed
			this._oODataModel.setProperty(sItemPath + '/CostObj', "");
			this._oODataModel.setProperty(sItemPath + '/Geber', "");
			this._oODataModel.setProperty(sItemPath + '/Saknr', "");

			// sap.ui.getCore().getMessageManager().removeAllMessages();

			// this._oTableFilterState.aSearch = [new Filter("Rstgr", FilterOperator.EQ, "'" + oData.Rstgr + "'" )];

			// var aFilters = this._oTableFilterState.aSearch.concat(this._oTableFilterState.aFilter);
			// this._oTable.getBinding("items").filter(aFilters, "Application");
			// this._refreshModel = false;

		},

		/*
		-----------------------------------------------------------------------
		Cost Object Events  
		-----------------------------------------------------------------------
		*/
		onItemCostObjValueListChanged: function (oEvent) {
			var oSource = oEvent.getSource();

			this.getModel("appView").setProperty("/costObjectDerived", true);

		},
		/*  Cost Object entered, Call backend to validate and derive Fund and GL
		 */
		onItemCostObjChange: function (oEvent) {

			// if (oEvent.getParameters().validated === undefined) {
			// 	var sId = oEvent.getParameters().id;
			// 	this.getView().byId(sId).setValueState("Error");
			// 	this.getView().byId(sId).setValueStateText("Please select value from list");
			// 	this.getView().byId(sId).focus();
			// 	return;
			// }

			var sPath = this.getView().getBindingContext().getPath();
			var sItemPath = oEvent.getSource().getBindingContext().getPath();
			
			
			// Clear out FUND when Cost Object is changed
			this._oODataModel.setProperty(sItemPath + '/Geber', "");
			this._oODataModel.setProperty(sItemPath + '/Saknr', "");
			
			var oData = this._oODataModel.getData(sPath);
			var oItemData = this._oODataModel.getData(sItemPath);

			sap.ui.getCore().getMessageManager().removeAllMessages();

			// var oChildContext = this._oODataModel.createEntry("ET_FV60ItemSet", {
			// 	properties: {
			// 		Bukrs: oItemData.Bukrs,
			// 		Belnr: oItemData.Belnr,
			// 		Gjahr: oItemData.Gjahr,
			// 		Bzkey: oItemData.Bzkey,
			// 		CoTypDesc: oItemData.CoTypDesc,
			// 		CostObj: oItemData.CostObj
			// 	},
			// 	success: this._fnItemCreated.bind(this),
			// 	error: this._fnItemCreationFailed.bind(this),
			// 	oContext: sPath
			// });

			this._oTableFilterState.aSearch = [
				new Filter("Rstgr", FilterOperator.EQ, "'" + oData.Rstgr + "'"),
				new Filter("Bzkey", FilterOperator.EQ, oItemData.Bzkey)
				//	new Filter("AddFlag", FilterOperator.EQ, "'A'")
			];

			var aFilters = this._oTableFilterState.aSearch.concat(this._oTableFilterState.aFilter);
			this._oTable.getBinding("items").filter(aFilters, "Application");
			//this._refreshModel = false;

			// -- Call Backend	
			this._oODataModel.submitChanges({
				success: this._fnCostObjSuccess.bind(this)
			});
			//this._oODataModel.deleteCreatedEntry(oChildContext);

			//-- Update App Variables
			this.getModel("appView").setProperty("/costObjectDerived", true);

		},

		_checkCostObjectDerived: function (oEvent) {
			oEvent.getModel("appView").setProperty("/costObjectDerived", false);
			var sPathFirstLine = oEvent._oTable.getBinding("items").aKeys[0];
			if (sPathFirstLine !== undefined) {
				var oFirstLineData = oEvent.getModel().getContext("/" + sPathFirstLine).getObject();
				if (oFirstLineData.CostObj !== "" && oFirstLineData.Geber !== "" && oFirstLineData.Saknr !== "") {
					oEvent.getModel("appView").setProperty("/costObjectDerived", true);
				}
			}
		},

		/*
		-----------------------------------------------------------------------
		GL Account Events
		-----------------------------------------------------------------------
		*/
		onItemGlAccountInitialised: function (oEvent) {
			var oSource = oEvent.getSource();
		},
		onItemGlAccountInnerControlCreated: function (oEvent) {
			//var oSource = oEvent.getSource();
			//var oControl = oEvent.getSource().getInnerControls().pop();
			//oControl.setValueHelpOnly(true);

		},
		onItemGlAccountValueListChanged: function (oEvent) {
			//var oSource = oEvent.getSource();

			//var oControl = oEvent.getSource().getInnerControls().pop();
		},
		onItemGlAccountChange: function (oEvent) {

			sap.ui.getCore().getMessageManager().removeAllMessages();
			this._itemsValidateSaveEnablement();
		},

		/*
		-----------------------------------------------------------------------
		Private events after submit
		-----------------------------------------------------------------------
		*/

		_fnCostObjSuccess: function (oData) {
			//var oParameters = oData.getParameters();
			//MessageToast.show("G/L and Fund Detived  ");
		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnHeaderEntityCreated: function (oData) {
			//var sObjectPath = this.getModel().createKey("ET_FV60HeaderSet", oData);
			//this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			//this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnHeaderEntityCreationFailed: function () {
			this.getModel("appView").setProperty("/busy", false);
		},

		_fnItemCreated: function (oEvent) {
			var oAppViewModel = this.getModel("appView");
			//oAppViewModel.setProperty("/itemAddButtonEnabled", true);

			//oAppViewModel.setProperty("/itemToSelect", sPath);
			//this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			var sObjectPath = this.getModel().createKey("ET_FV60HeaderSet", oEvent);
			oAppViewModel.setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			oAppViewModel.setProperty("/busy", false);

			//if (this._refreshModel === true) {
			//	this.getView().getModel().refresh();
			//}
		},

		_fnItemCreationFailed: function (oEvent) {
			MessageToast.show("Item Creation failed");

		},

		/**
		 * Handles the success of updating an object
		 * @private
		 */
		_fnUpdateSuccess: function () {
			this.getModel("appView").setProperty("/busy", false);
			this.getModel("appView").setProperty("/addEnabled", true);
			this.getModel("appView").setProperty("/mode", "display");

			if (this.getView().getBindingContext().getObject().Belnr === "9999999999") {
				this._oODataModel.deleteCreatedEntry(this.getView().getBindingContext());

			}

			//this.getView().unbindObject();
			//this.getRouter().getTargets().display("object");
			// -- Testing...
			this._oODataModel.refresh();
			this._navBack();
		},

		/**
		 * Handles the success of creating an object
		 *@param {object} oData the response of the save action
		 * @private
		 */
		_fnEntityCreated: function (oData) {
			var sObjectPath = this.getModel().createKey("ET_FV60HeaderSet", oData);
			this.getModel("appView").setProperty("/itemToSelect", "/" + sObjectPath); //save last created
			this.getModel("appView").setProperty("/busy", false);
			this.getRouter().getTargets().display("object");
		},

		/**
		 * Handles the failure of creating/updating an object
		 * @private
		 */
		_fnEntityCreationFailed: function () {
			this.getModel("appView").setProperty("/busy", false);
		},

		/*
		-----------------------------------------------------------------------
		Attachment Control Events
		-----------------------------------------------------------------------
		*/

		onUploadComplete: function (oEvent) {
			//var oUploadCollection = this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));
			//var oData = oUploadCollection.getModel().getData();
			var oView = oEvent.getSource().getParent();
			var oModel = oView.getModel();
			oModel.refresh();

			// Sets the text to the label
			this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "attachmentTitle")).setText(this.getAttachmentTitleText());

			// delay the success message for to notice onChange message
			setTimeout(function () {
				MessageToast.show("Attachment Upload Completed");
			}, 4000);
		},

		onBeforeUploadStarts: function (oEvent) {
			// Header Slug
			var oCustomerHeaderSlug = new UploadCollectionParameter({
				name: "slug",
				value: oEvent.getParameter("fileName")
			});
			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: this.getModel().getSecurityToken()
			});

			var oUploadCollection = oEvent.getSource();
			var oView = oEvent.getSource().getParent();
			var oModel = oView.getModel();
			var sServiceUrl = oModel.sServiceUrl;
			var sPath = oView.getBindingContext().getPath();
			var endUrl = oUploadCollection.mBindingInfos.items.path; //"/to_attach"
			var uploadUrl = sServiceUrl + sPath + '/' + endUrl;

			oUploadCollection.setUploadUrl(uploadUrl);

			oEvent.getParameters().addHeaderParameter(oCustomerHeaderSlug);
			//oEvent.getParameters().addHeaderParameter(oCustomerHeaderToken);
			//MessageToast.show("BeforeUploadStarts event triggered.");
		},

		onChange: function (oEvent) {
			var oUploadCollection = oEvent.getSource();

			var oCustomerHeaderToken = new UploadCollectionParameter({
				name: "x-csrf-token",
				value: this.getModel().getSecurityToken()
			});
			oUploadCollection.addHeaderParameter(oCustomerHeaderToken);

		},

		getAttachmentTitleText: function () {
			var aItems = this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection")).getItems();
			return "Uploaded (" + aItems.length + ")";
		},

		onStartUpload: function (oEvent) {
			var oUploadCollection = this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));

			var cFiles = oUploadCollection.getItems().length;
			var uploadInfo = cFiles + " file(s)";

			if (cFiles > 0) {
				oUploadCollection.upload();

				MessageToast.show("Method Upload is called (" + uploadInfo + ")");
				MessageBox.information("Uploaded " + uploadInfo);
			}
		},

		onDownloadItem: function () {
			var oUploadCollection = this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));
			var aSelectedItems = oUploadCollection.getSelectedItems();
			if (aSelectedItems) {
				for (var i = 0; i < aSelectedItems.length; i++) {
					oUploadCollection.downloadItem(aSelectedItems[i], true);
				}
			} else {
				MessageToast.show("Select an item to download");
			}
		},

		onSelectionChange: function () {
			var oUploadCollection = this.byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "uploadCollection"));
			// If there's any item selected, sets download button enabled
			if (oUploadCollection.getSelectedItems().length > 0) {
				this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "downloadButton")).setEnabled(true);
			} else {
				this.getView().byId(sap.ui.core.Fragment.createId("frgSharedPageAttachment", "downloadButton")).setEnabled(false);
			}
		},

		onFileDeleted: function (oEvent) {
			// Confirmation to delete by the user  	
			var sPath = oEvent.getParameters().item.getBindingContext().getPath();
			var sSuccessMessage = this._oResourceBundle.getText("deleteAttachmentLineItemSuccess");

			var fnAfterAttchmentLineDeleted = function () {
				MessageToast.show(sSuccessMessage);
				//oViewModel.setProperty("/busy", false);
				// Refresh table entries ...
			};

			sap.m.MessageToast.show("Event fileDeleted triggered");

			// Calls the oData Delete service
			this._callLineItemDelete([sPath], fnAfterAttchmentLineDeleted);
		},

		/*
		-----------------------------------------------------------------------
		Save/Submit Events
		-----------------------------------------------------------------------
		*/

		/**
		 * Event handler (attached declaratively) for the view save button. Saves the changes added by the user. 
		 * @function
		 * @public
		 */
		onSave: function (oEvent) {
			var that = this,
				oModel = this.getModel();

			this._validateSaveEnablement();
			if (this._oViewModel.getProperty("/enableSave") === false) {
				return;
			}

			// Set Posting indicator for backend
			var sPath = this.getView().getBindingContext().getPath();
			var sBtnId = oEvent.getSource().getId();
			if (sBtnId.search("semButtonSubmit") > 0) {
				oModel.setProperty(sPath + "/ZuiEventCd", "S"); // SUBMIT

				// Message to add Attahment on submit
				var aListAttachments = this._oAttachments.getItems();
				if (aListAttachments === undefined || aListAttachments.length === 0) {
					MessageBox.warning("Please add PDF Attachment ");
					return;
				}

			} else {
				oModel.setProperty(sPath + "/ZuiEventCd", "P"); // SAVE

			}

			// abort if the  model has not been changed
			if (!oModel.hasPendingChanges()) {
				//MessageBox.information(
				MessageBox.confirm(
					this._oResourceBundle.getText("noChangesMessage"), {
						id: "noChangesInfoMessageBox",
						styleClass: that.getOwnerComponent().getContentDensityClass(),
						onClose: function (oAction) {
							if (oAction === sap.m.MessageBox.Action.OK) {

								oModel.setProperty(that.getView().getBindingContext().getPath() + "/ZuiEventCd", "R"); // SAVE SAVE
								that._handleSave();
							}
						}
					}
				);
				//return;
			} else {

				this._handleSave();

			}
		},

		_handleSave: function () {

			var that = this,
				oModel = this.getModel();

			var oAppView = this.getModel("appView");
			oAppView.setProperty("/busy", true);

			if (oAppView.getProperty("/mode") === "edit") {
				// attach to the request completed event of the batch
				oModel.attachEventOnce("batchRequestCompleted", function (oBatchEvent) {
					if (that._checkIfBatchRequestSucceeded(oBatchEvent)) {
						that._fnUpdateSuccess();
					} else {
						that._fnEntityCreationFailed();
						//MessageBox.error(that._oResourceBundle.getText("updateError"));
					}
				});
			}
			// -- Submit changes
			oModel.submitChanges({
				success: that._fnSubmitSuccess.bind(that),
				error: that._fnSubmitError.bind(that)
			});
		},

		_fnSubmitSuccess: function (oData) {
			var sStatusCode = "";
			for (var i in oData.__batchResponses) {
				var oResponseData = oData.__batchResponses[i];
				if (oResponseData.response !== undefined) {
					sStatusCode = oResponseData.response.statusCode;
				}
			}
			if (sStatusCode !== "400") {

				this.getModel("appView").setProperty("/busy", false);
				this.getRouter().getTargets().display("object");

				// - check by creating new doc
				this._oODataModel.resetChanges();
				this._oODataModel.refresh();

			}
		},

		_fnSubmitError: function (oData) {},

		_checkIfBatchRequestSucceeded: function (oBatchEvent) {
			var oParams = oBatchEvent.getParameters();
			var aRequests = oBatchEvent.getParameters().requests;
			var oRequest;
			if (oParams.success) {
				if (aRequests) {
					for (var i = 0; i < aRequests.length; i++) {
						oRequest = oBatchEvent.getParameters().requests[i];
						if (!oRequest.success) {
							return false;
						}
					}
				}
				return true;
			} else {
				return false;
			}
		},

		/*
		-----------------------------------------------------------------------
		Cancel Events
		-----------------------------------------------------------------------
		*/

		/**
		 * Event handler (attached declaratively) for the view cancel button. Asks the user confirmation to discard the changes. 
		 * @function
		 * @public
		 */
		onCancel: function () {
			// check if the model has been changed
			if (this.getModel().hasPendingChanges()) {
				// get user confirmation first
				this._showConfirmQuitChanges(); // some other thing here....
			} else {

				// * test  for create 	
				//this._oODataModel.deleteCreatedEntry(this.getView().getBindingContext());
				// * test  for create 	

				this.getModel("appView").setProperty("/addEnabled", true);
				this.getModel("appView").setProperty("/mode", "display");
				this.getModel("appView").setProperty("/cancelButtonPressed", true);

				//var sPath = this.getView().getBindingContext().getPath();
				//this.getOwnerComponent().oListSelector.findFirstItem();
				this._oODataModel.resetChanges();

				// cancel without confirmation
				this._navBack();
			}
		},

		/**
		 * Navigates back in the browser history, if the entry was created by this app.
		 * If not, it navigates to the Details page
		 * @private
		 */
		_navBack: function () {
			var oHistory = sap.ui.core.routing.History.getInstance(),
				sPreviousHash = oHistory.getPreviousHash();

			// Detach view binding
			this.getView().unbindObject();

			if (sPreviousHash !== undefined) {
				// The history contains a previous entry
				history.go(-1);
			} else {

				this.getRouter().getTargets().display("object");
			}
		},

		/**
		 * Opens a dialog letting the user either confirm or cancel the quit and discard of changes.
		 * @private
		 */
		_showConfirmQuitChanges: function () {
			var oComponent = this.getOwnerComponent();
			//oModel = this.getModel();
			var that = this;
			MessageBox.confirm(
				this._oResourceBundle.getText("confirmCancelMessage"), {
					styleClass: oComponent.getContentDensityClass(),
					onClose: function (oAction) {
						if (oAction === sap.m.MessageBox.Action.OK) {
							that.getModel("appView").setProperty("/addEnabled", true);
							that.getModel("appView").setProperty("/mode", "display");
							that.getModel("appView").setProperty("/cancelButtonPressed", true);

							// * test  for create 	
							that._oODataModel.deleteCreatedEntry(that.getView().getBindingContext());
							that._oODataModel.resetChanges();
							that._oODataModel.refresh();

							//var sPath = that.getView().getBindingContext().getPath();
							//that.getOwnerComponent().oListSelector.selectAListItem(sPath);

							that._navBack();
						}
					}
				}
			);
		},

		/*
		-----------------------------------------------------------------------
		Validation Events
		-----------------------------------------------------------------------
		*/

		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_itemsValidateSaveEnablement: function (oEvent) {

			this._oViewModel.setProperty("/enableSave", false);
			this._unAllocatedAmount();

			var mandatoryItemFields = {
				"CoTypDesc_id": "Please enter Cost Object Type",
				"CostObj_id": "Please enter Cost Object ",
				"Geber_id": "Please enter Fund",
				"Saknr_id": "Please enter G/L Account",
				"Dmbtr_item_id": "Please enter Amount"
			};

			//  Validate current line item
			if (oEvent !== undefined) {
				var aCurrentLineItemCells = oEvent.getSource().getParent().getCells();
				for (var nFieldCount in aCurrentLineItemCells) {
					var oControl = aCurrentLineItemCells[nFieldCount];
					if (oControl.getMetadata().getName().search("Text") < 0) {
						if (oControl.getMandatory()) {
							if (!oControl.getValue()) {

								//MessageToast.show(mandatoryItemFields[aCurrentLineItemCells[nFieldCount].getName()]);
								oControl.setValueState("Error");
								oControl.setValueStateText(mandatoryItemFields[oControl.getName()]);
								oControl.focus();
								this._oViewModel.setProperty("/enableSave", false);
								this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
								return;
							}
							if (oControl.getName() === "Dmbtr_item_id" &&
								parseFloat(oControl.getValue(), 10) === 0) {
								this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
							}
						}
					}
				}
			} else {

				var aAllItems = this._oTable.getItems();
				for (var nTableCount in aAllItems) {
					var aTableLineItemCells = aAllItems[nTableCount].getCells();

					var oTableLineObject = aAllItems[nTableCount].getBindingContext().getObject();

					if (oTableLineObject.CoTypDesc !== "" &&
						oTableLineObject.CostObj !== "" &&
						oTableLineObject.Geber !== "" &&
						oTableLineObject.Saknr !== "") {

						for (var nTFieldCount in aTableLineItemCells) {
							var oTablelineFieldControl = aTableLineItemCells[nTFieldCount];
							if (oTablelineFieldControl.getMetadata().getName().search("SmartField") > 0) {
								if (oTablelineFieldControl.getMandatory()) {
									if (!oTablelineFieldControl.getValue()) {

										//MessageToast.show(mandatoryItemFields[aCurrentLineItemCells[nTFieldCount].getName()]);
										oTablelineFieldControl.focus();
										this._oViewModel.setProperty("/enableSave", false);
										this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
										return;
									}
									if (oTablelineFieldControl.getName() === "Dmbtr_item_id" &&
										parseFloat(oTablelineFieldControl.getValue(), 10) === 0) {
										this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
									}
								}
							}
						}

					}
				}

			}
		},
		/**
		 * Checks if the save button can be enabled
		 * @private
		 */
		_validateSaveEnablement: function (oEvent) {

			if (oEvent !== undefined &&
				oEvent.getParameters().id.search("Dmbtr_id") > 0) {
				this._unAllocatedAmount();
			}

			var mandatoryHeaderFields = {
				"DescS_id": "Please enter Category",
				"Budat_id": "Please enter Posting Date ",
				"Lifnr_id": "Please enter Vendor",
				"Bldat_id": "Please enter Vendor Invoice Date",
				"Xblnr_id": "Please enter Reference Number",
				"Dmbtr_id": "Please enter Amount",
				"Sgtxt_id": "Please enter Header Text"

			};

			// var aInputControls = this._getFormFields(this.byId(sap.ui.core.Fragment.createId("frgSharedPageHeader", "newEntitySimpleForm")));
			var aInputControls = this._getFormFields(this.byId(sap.ui.core.Fragment.createId("frgSharedPageHeader", "formGen")));
			aInputControls.push(this._getFormFields(this.byId(sap.ui.core.Fragment.createId("frgSharedPageHeader", "formVen"))));
			aInputControls.push(this._getFormFields(this.byId(sap.ui.core.Fragment.createId("frgSharedPageHeader", "formPay"))));

			for (var nHeaderFieldsIndex in aInputControls) {
				var oControl = aInputControls[nHeaderFieldsIndex].control;
				if (oControl !== undefined && oControl.getRequired()) {
					if (!oControl.getValue() || oControl.getValue() === "" || parseInt(oControl.getValue(), 10) === 0) {
						//MessageToast.show(mandatoryHeaderFields[oControl.getName()]);
						oControl.setValueState("Error");
						oControl.setValueStateText(mandatoryHeaderFields[oControl.getName()]);
						oControl.focus();
						this._oViewModel.setProperty("/enableSave", false);
						return;
					}
				}

			}
			this._checkForErrorMessages();
			this._itemsValidateSaveEnablement();

		},

		_unAllocatedAmount: function () {
			var oContext = this.getView().getBindingContext();
			if (oContext === undefined) {
				return;
			}

			//  Calculate item total and compare to header total
			var lineItemTotalCalculated = 0;
			var foundZeroLineItem = false;
			var aAllItems = this._oTable.getItems();
			for (var nRowCount in aAllItems) {
				var sItemPath = aAllItems[nRowCount].getBindingContext().getPath();
				var oLineItem = this._oODataModel.getContext(sItemPath).getObject();
				lineItemTotalCalculated += parseFloat(oLineItem.Dmbtr, 10);
				lineItemTotalCalculated = Math.round(lineItemTotalCalculated * 100) / 100; // Added for rounding error
				if (parseFloat(oLineItem.Dmbtr, 10) === 0) {
					foundZeroLineItem = true;
				}
			}
			var oHeaderPath = this.getView().getBindingContext().getPath();
			var headerTotal = parseFloat(this._oODataModel.getContext(oHeaderPath).getObject().Dmbtr, 10);
			var unAllocated = (headerTotal - lineItemTotalCalculated).toFixed(2);
			var unAllocatedTotal = [unAllocated.toString(), "$"];

			this.getModel('appView').setProperty("/unAllocatedLineItemTotal", unAllocatedTotal);

			if (headerTotal === lineItemTotalCalculated && headerTotal !== 0) {
				this._oViewModel.setProperty("/enableSave", true);
				this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
				//return;
			} else {
				this._oViewModel.setProperty("/enableSave", false);
				if (lineItemTotalCalculated !== 0) {
					if (!foundZeroLineItem) {
						this.getModel("appView").setProperty("/itemAddButtonEnabled", true);
					} else {
						this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
					}
				} else {
					if (aAllItems.length === 0) {
						this.getModel("appView").setProperty("/itemAddButtonEnabled", true);
					} else {
						this.getModel("appView").setProperty("/itemAddButtonEnabled", false);
					}
				}
			}
		},

		/**
		 * Checks if there is any wrong inputs that can not be saved.
		 * @private
		 */

		_checkForErrorMessages: function () {
			var aMessages = this._oBinding.oModel.oData;
			if (aMessages.length > 0) {
				var bEnableCreate = true;
				for (var i = 0; i < aMessages.length; i++) {
					if (aMessages[i].type === "Error" && !aMessages[i].technical) {
						bEnableCreate = false;
						break;
					}
				}
				this._oViewModel.setProperty("/enableSave", bEnableCreate);
			} else {
				this._oViewModel.setProperty("/enableSave", true);
			}
		},

		/**
		 * Gets the form fields
		 * @param {sap.ui.layout.form} oSimpleForm the form in the view.
		 * @private
		 */
		_getFormFields: function (oSimpleForm) {
			var aControls = [];
			// var aFormContent = oSimpleForm.getContent();

			var aFormContent = oSimpleForm.getSmartFields();

			var sControlType;
			for (var i = 0; i < aFormContent.length; i++) {
				sControlType = aFormContent[i].getMetadata().getName();
				if (sControlType === "sap.m.Input" ||
					sControlType === "sap.m.DateTimeInput" ||
					sControlType === "sap.m.CheckBox" ||
					sControlType === "sap.m.DatePicker" ||
					sControlType === "sap.ui.comp.smartfield.SmartField"
				) {
					aControls.push({
						control: aFormContent[i],
						required: aFormContent[i].getRequired && aFormContent[i].getRequired()
					});
				}
			}
			return aControls;
		},

		beforeShowOverlay: function (oEvent) {
			var oSource = oEvent.getSource();
		}

	});

});