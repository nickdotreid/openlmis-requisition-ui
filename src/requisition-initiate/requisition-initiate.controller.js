/*
 * This program is part of the OpenLMIS logistics management information system platform software.
 * Copyright © 2017 VillageReach
 *
 * This program is free software: you can redistribute it and/or modify it under the terms
 * of the GNU Affero General Public License as published by the Free Software Foundation, either
 * version 3 of the License, or (at your option) any later version.
 *  
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 
 * See the GNU Affero General Public License for more details. You should have received a copy of
 * the GNU Affero General Public License along with this program. If not, see
 * http://www.gnu.org/licenses.  For additional information contact info@OpenLMIS.org. 
 */


(function() {

    'use strict';

    /**
     * @ngdoc controller
     * @name requisition-initiate.controller:RequisitionInitiateController
     *
     * @description
     * Controller responsible for actions connected with displaying available periods and
     * initiating or navigating to an existing requisition.
     */
    angular
        .module('requisition-initiate')
        .controller('RequisitionInitiateController', RequisitionInitiateController);

    RequisitionInitiateController.$inject = [
        'messageService', 'facility', 'user', 'supervisedPrograms', 'homePrograms',
        'requisitionService', '$state', 'dateUtils', 'REQUISITION_STATUS', 'loadingModalService',
        'notificationService', 'authorizationService', '$q', 'REQUISITION_RIGHTS',
        'facilityService', 'userRightFactory', '$stateParams', 'periods'
    ];

    function RequisitionInitiateController(messageService, facility, user, supervisedPrograms,
                                     homePrograms, requisitionService, $state, dateUtils,
                                     REQUISITION_STATUS, loadingModalService, notificationService,
                                     authorizationService, $q, REQUISITION_RIGHTS, facilityService,
                                     userRightFactory, $stateParams, periods) {

        var vm = this;

        vm.$onInit = onInit;
        vm.loadPeriods = loadPeriods;
        vm.programOptionMessage = programOptionMessage;
        vm.initRnr = initRnr;
        vm.updateFacilityType = updateFacilityType;
        vm.loadFacilitiesForProgram = loadFacilitiesForProgram;

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name emergency
         * @type {Boolean}
         *
         * @description
         * Holds a boolean indicating if the currently selected requisition type is standard or emergency
         */
        vm.emergency = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name facilities
         * @type {Array}
         *
         * @description
         * Holds available facilities based on the selected type and/or programs
         */
        vm.facilities = [];

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name supervisedPrograms
         * @type {Array}
         *
         * @description
         * Holds available programs where user has supervisory permissions.
         */
        vm.supervisedPrograms = supervisedPrograms;

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name homePrograms
         * @type {Array}
         *
         * @description
         * Holds available programs for home facility.
         */
        vm.homePrograms = homePrograms;

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name isSupervised
         * @type {Boolean}
         *
         * @description
         * Holds currently selected facility selection type:
         *  false - my facility
         *  true - supervised facility
         */
        vm.isSupervised = undefined;

        /**
         * @ngdoc property
         * @propertyOf requisition-initiate.controller:RequisitionInitiateController
         * @name periods
         * @type {List}
         *
         * @description
         * The list of all periods displayed in the table.
         */
        vm.periods = undefined;

        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name $onInit
         *
         * @description
         * Initialization method of the RequisitionInitiateController controller.
         */
        function onInit() {
            vm.emergency = $stateParams.emergency === 'true';
            vm.periods = periods;

            vm.isSupervised = $stateParams.supervised === 'true';
            updateFacilityType(vm.isSupervised);

            vm.selectedProgramId = $stateParams.program;

            if (vm.isSupervised) {
                loadFacilitiesForProgram(vm.selectedProgramId);
                vm.selectedFacilityId = $stateParams.facility;
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name loadFacilityData
         *
         * @description
         * Responsible for displaying and updating select elements that allow to choose
         * program and facility to initiate or proceed with the requisition for.
         * If isSupervised is true then it will display all programs where the current
         * user has supervisory permissions. If the param is false, then list of programs
         * from user's home facility will be displayed.
         *
         * @param {Boolean} isSupervised indicates type of facility to initiate or proceed with the requisition for
         */
        function updateFacilityType(isSupervised) {

            vm.supervisedFacilitiesDisabled = vm.supervisedPrograms.length <= 0;

            if (isSupervised) {
                vm.error = '';
                vm.programs = vm.supervisedPrograms;
                vm.facilities = [];
                vm.selectedFacilityId = undefined;
                vm.selectedProgramId = undefined;

                if (vm.programs.length === 1) {
                    vm.selectedProgramId = vm.programs[0].id;
                    loadFacilitiesForProgram(vm.programs[0].id);
                }
            } else {
                vm.error = '';
                vm.programs = vm.homePrograms;
                vm.facilities = [facility];
                vm.selectedFacilityId = facility.id;
                vm.selectedProgramId = undefined;

                if (vm.programs.length <= 0) {
                    vm.error = messageService.get('requisitionInitiate.noProgramsForFacility');
                } else if (vm.programs.length === 1) {
                    vm.selectedProgramId = vm.programs[0].id;
                }
            }
        }


        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name programOptionMessage
         *
         * @description
         * Determines a proper message for the programs dropdown, based on the presence of programs.
         *
         * @return {String} localized message
         */
        function programOptionMessage() {
            return vm.programs === undefined || _.isEmpty(vm.programs) ?
                messageService.get('requisitionInitiate.noneAssigned') :
                messageService.get('requisitionInitiate.selectProgram');
        }

        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name loadPeriods
         *
         * @description
         * Responsible for displaying and updating a grid, containing available periods for the
         * selected program, facility and type. It will set an error message if no periods have
         * been found for the given parameters. It will also filter out periods for which there
         * already exists a requisition with an AUTHORIZED, APPROVED, IN_APPROVAL or RELEASED
         * status.
         */
        function loadPeriods() {
            $state.go('openlmis.requisitions.initRnr', {
                supervised: vm.isSupervised,
                program: vm.selectedProgramId,
                facility: vm.selectedFacilityId,
                emergency: vm.emergency
            }, {
                reload: true
            });
        }

        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name initRnr
         *
         * @description
         * Responsible for initiating and/or navigating to the requisition, based on the specified
         * period. If the provided period does not have a requisition associated with it, one
         * will be initiated for the currently selected facility, program, emergency status and
         * provided period. In case of a successful response, a redirect to the newly initiated
         * requisition is made. Otherwise an error about failed requisition initiate is shown. If
         * the provided period is already associated with a requisition, the function only
         * performs a redirect to that requisition.
         *
         * @param {Object} selectedPeriod a period to initiate or proceed with the requisition for
         */
        function initRnr(selectedPeriod) {
            vm.error = '';
            if (!selectedPeriod.rnrId || selectedPeriod.rnrStatus == messageService.get('requisitionInitiate.notYetStarted')) {
                loadingModalService.open();
                userRightFactory.checkRightForCurrentUser(REQUISITION_RIGHTS.REQUISITION_CREATE, vm.selectedProgramId, vm.selectedFacilityId).then(function(response) {
                    if(response) {
                        requisitionService.initiate(vm.selectedFacilityId,
                            vm.selectedProgramId,
                            selectedPeriod.id,
                            vm.emergency)
                        .then(function (data) {
                            $state.go('openlmis.requisitions.requisition.fullSupply', {
                                rnr: data.id
                            });
                        }, handleError('requisitionInitiate.couldNotInitiateRequisition'));
                    } else {
                        handleError('requisitionInitiate.noPermissionToInitiateRequisition')();
                    }
                }, handleError('requisitionInitiate.noPermissionToInitiateRequisition'));
            } else {
                $state.go('openlmis.requisitions.requisition.fullSupply', {
                    rnr: selectedPeriod.rnrId
                });
            }
        }
        /**
         * @ngdoc method
         * @methodOf requisition-initiate.controller:RequisitionInitiateController
         * @name loadFacilitiesForProgram
         *
         * @description
         * Responsible for providing a list of facilities where selected program is active and
         * where the current user has supervisory permissions.
         *
         * @param {Object} selectedProgramId id of selected program where user has supervisory permissions
         */
        function loadFacilitiesForProgram(selectedProgramId) {
            if (selectedProgramId) {
                loadingModalService.open();
                var createRight = authorizationService.getRightByName(REQUISITION_RIGHTS.REQUISITION_CREATE),
                    authorizeRight = authorizationService.getRightByName(REQUISITION_RIGHTS.REQUISITION_AUTHORIZE),
                    promises = [];

                if(createRight) {
                    promises.push(facilityService.getUserSupervisedFacilities(user.user_id, selectedProgramId, createRight.id))
                }
                if(authorizeRight) {
                    promises.push(facilityService.getUserSupervisedFacilities(user.user_id, selectedProgramId, authorizeRight.id))
                }

                if(promises.length > 0) {
                    $q.all(promises).then(function (facilities) {

                        if(promises.length > 1) {
                            vm.facilities = facilities[0].concat(facilities[1]);
                        } else {
                            vm.facilities = facilities[0];
                        }

                        if (vm.facilities.length <= 0) {
                            vm.error = messageService.get('requisitionInitiate.noFacilitiesForProgram');
                        } else {
                            vm.error = '';
                        }
                    })
                    .catch(function (error) {
                        notificationService.error('requisitionInitiate.errorOccurred');
                    })
                    .finally(loadingModalService.close);
                } else {
                    notificationService.error('requisitionInitiate.noRightToPerformThisAction');
                }
            } else {
                vm.facilities = [];
            }
        }

        function handleError(message) {
            return function() {
                loadingModalService.close();
                notificationService.error(message);
            };
        }
    }
})();
