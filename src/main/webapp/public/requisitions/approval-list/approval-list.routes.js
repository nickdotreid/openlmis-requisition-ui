(function() {
	
	'use strict';

	angular.module('openlmis.requisitions').config(routes);

	routes.$inject = ['$stateProvider'];

	function routes($stateProvider) {

		$stateProvider.state('requisitions.approvalList', {
			url: '/requisitions/approvalList',
			controller: 'ApprovalListCtrl',
			templateUrl: 'requisitions/approval-list/approval-list.html',
			resolve: {
		        requisitionList: function ($http, OpenlmisURL) {
		          	return $http.get(OpenlmisURL('/requisition/api/requisitions/requisitions-for-approval'));
		        }
		    }
		});

	}

})();