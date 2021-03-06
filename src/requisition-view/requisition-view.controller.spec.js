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


describe('RequisitionViewController', function() {

    var $scope, $q, $state, notificationService, confirmService, vm, requisition,
        loadingModalService, deferred, requisitionUrlFactoryMock, requisitionValidatorMock,
        fullSupplyItems, nonFullSupplyItems, authorizationServiceSpy, confirmSpy,
        REQUISITION_RIGHTS, accessTokenFactorySpy, $window, stateTrackerService, messageService;

    beforeEach(function() {
        module('requisition-view');

        module(function($provide) {

            confirmSpy = jasmine.createSpyObj('confirmService', ['confirm', 'confirmDestroy']);

            authorizationServiceSpy = jasmine.createSpyObj('authorizationService', ['hasRight']);
            accessTokenFactorySpy = jasmine.createSpyObj('accessTokenFactory', ['addAccessToken']);

            requisitionValidatorMock = jasmine.createSpyObj('requisitionValidator', [
                'areLineItemsValid',
                'validateRequisition',
                'areAllLineItemsSkipped'
            ]);
            requisitionUrlFactoryMock = jasmine.createSpy();

            $provide.service('confirmService', function() {
                return confirmSpy;
            });

            $provide.service('authorizationService', function() {
                return authorizationServiceSpy;
            });

            $provide.service('accessTokenFactory', function() {
                return accessTokenFactorySpy;
            });

            $provide.factory('requisitionUrlFactory', function() {
                return requisitionUrlFactoryMock;
            });

            $provide.factory('requisitionValidator', function() {
                return requisitionValidatorMock;
            });
        });

        inject(function($injector) {
            $scope = $injector.get('$rootScope').$new();
            $state = $injector.get('$state');
            $q = $injector.get('$q');
            $window = $injector.get('$window');
            notificationService = $injector.get('notificationService');
            confirmService = $injector.get('confirmService');
            loadingModalService = $injector.get('loadingModalService');
            REQUISITION_RIGHTS = $injector.get('REQUISITION_RIGHTS');
            stateTrackerService = $injector.get('stateTrackerService');
            messageService = $injector.get('messageService');

            confirmService.confirm.andCallFake(function() {
                return $q.when(true);
            });

            deferred = $q.defer();
            requisition = jasmine.createSpyObj('requisition',
                ['$skip', '$isInitiated', '$isSubmitted', '$isAuthorized', '$isInApproval', '$isReleased', '$save', '$authorize', '$submit', '$remove', '$approve', '$reject']);
            requisition.id = '1';
            requisition.program = {
                id: '2',
                periodsSkippable: true,
                code: 'CODE'
            };
            requisition.$isInitiated.andReturn(true);
            requisition.$isReleased.andReturn(false);
            requisition.$skip.andReturn(deferred.promise);
            requisition.$save.andReturn(deferred.promise);
            requisition.$authorize.andReturn(deferred.promise);
            spyOn(stateTrackerService, 'goToPreviousState');

            vm = $injector.get('$controller')('RequisitionViewController', {
                $scope: $scope,
                requisition: requisition
            });
        });

        requisitionUrlFactoryMock.andCallFake(function(url) {
            return 'http://some.url' + url;
        });

        fullSupplyItems = [{
            skipped: '',
            $program: {
                fullSupply: true
            }
        }];

        nonFullSupplyItems = [{
            skipped: '',
            $program: {
                fullSupply: false
            }
        }];

        requisition.requisitionLineItems = fullSupplyItems.concat(nonFullSupplyItems);
    });

    it('should display skip button', function() {
        authorizationServiceSpy.hasRight.andReturn(true);
        expect(vm.displaySkip()).toBe(true);
    });

    it('should not display skip button if user has no permission to create requisition', function() {
        authorizationServiceSpy.hasRight.andReturn(false);
        expect(vm.displaySkip()).toBe(false);
    });

    it('should not display skip button if program does not allow skipping periods', function() {
        authorizationServiceSpy.hasRight.andReturn(true);
        vm.requisition.program.periodsSkippable = false;
        expect(vm.displaySkip()).toBe(false);
    });

    it('should not display skip button if requisition has emergency type', function() {
        authorizationServiceSpy.hasRight.andReturn(true);
        vm.requisition.emergency = true;
        expect(vm.displaySkip()).toBe(false);
    });

    it('should display skip button if requisition is not in initiated status', function() {
        authorizationServiceSpy.hasRight.andReturn(true);
        vm.requisition.$isInitiated.andReturn(false);
        expect(vm.displaySkip()).toBe(false);
    });

    it('should display message when successfully skipped requisition', function() {
        var notificationServiceSpy = jasmine.createSpy(),
            stateGoSpy = jasmine.createSpy(),
            loadingDeferred = $q.defer();


        spyOn(notificationService, 'success').andCallFake(notificationServiceSpy);
        spyOn(loadingModalService, 'open').andReturn(loadingDeferred.promise);
        spyOn($state, 'go').andCallFake(stateGoSpy);

        vm.skipRnr();

        deferred.resolve();
        $scope.$apply();
        loadingDeferred.resolve();
        $scope.$apply();

        expect(notificationServiceSpy).toHaveBeenCalledWith('requisitionView.skip.success');
        expect(stateTrackerService.goToPreviousState).toHaveBeenCalledWith('openlmis.requisitions.initRnr');
    });

    it('should display error message when skip requisition failed', function() {
        var notificationServiceSpy = jasmine.createSpy();

        spyOn(notificationService, 'error').andCallFake(notificationServiceSpy);

        vm.skipRnr();

        deferred.reject();
        $scope.$apply();

        expect(notificationServiceSpy).toHaveBeenCalledWith('requisitionView.skip.failure');
    });

    it('getPrintUrl should prepare URL correctly', function() {
        expect(vm.getPrintUrl()).toEqual('http://some.url/api/requisitions/1/print');
    });

    it('should display sync button when initiated', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isInitiated.andReturn(true);
        vm.requisition.$isSubmitted.andReturn(false);
        vm.requisition.$isAuthorized.andReturn(false);
        vm.requisition.$isInApproval.andReturn(false);

        expect(vm.displaySync()).toBe(true);
    });

    it('should display sync button when submitted', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isInitiated.andReturn(false);
        vm.requisition.$isSubmitted.andReturn(true);
        vm.requisition.$isAuthorized.andReturn(false);
        vm.requisition.$isInApproval.andReturn(true);

        expect(vm.displaySync()).toBe(true);
    });

    it('should display sync button when authorized', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isInitiated.andReturn(false);
        vm.requisition.$isSubmitted.andReturn(false);
        vm.requisition.$isAuthorized.andReturn(true);
        vm.requisition.$isInApproval.andReturn(true);

        expect(vm.displaySync()).toBe(true);
    });

    it('should display sync button in approval', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isInitiated.andReturn(false);
        vm.requisition.$isSubmitted.andReturn(false);
        vm.requisition.$isAuthorized.andReturn(false);
        vm.requisition.$isInApproval.andReturn(true);

        expect(vm.displaySync()).toBe(true);
    });

    it('should not display sync button', function() {
        vm.requisition.$isInitiated.andReturn(false);
        vm.requisition.$isSubmitted.andReturn(false);
        vm.requisition.$isAuthorized.andReturn(false);
        vm.requisition.$isInApproval.andReturn(false);
        expect(vm.displaySync()).toBe(false);
    });

    it('should display delete button when initiated', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isInitiated.andReturn(true);

        expect(vm.displayDelete()).toBe(true);
    });

    it('should display delete button when submitted', function() {
        authorizationServiceSpy.hasRight.andReturn(true);

        vm.requisition.$isSubmitted.andReturn(true);

        expect(vm.displayDelete()).toBe(true);
    });

    it('should not display delete button', function() {
        expect(vm.displayDelete()).toBe(false);
    });

    describe('Sync error handling', function() {

        it('should reload requisition when conflict response received', function() {
            verifyReloadOnErrorAndNotificationSent(409, 'requisitionView.versionMismatch')
        });

        it('should reload requisition when forbidden response received', function() {
            verifyReloadOnErrorAndNotificationSent(403, 'requisitionView.updateForbidden')
        });

        it('should not reload requisition when bad request response received', function() {
            verifyNoReloadOnError(400);
        });

        it('should not reload requisition when internal server error request response received', function() {
            verifyNoReloadOnError(500);
        });

        function verifyReloadOnErrorAndNotificationSent(responseStatus, messageKey) {
          var notificationServiceSpy = jasmine.createSpy(),
              stateSpy = jasmine.createSpy(),
              conflictResponse = { status: responseStatus };

          spyOn(notificationService, 'error').andCallFake(notificationServiceSpy);
          spyOn($state, 'reload').andCallFake(stateSpy);

          vm.syncRnr();

          deferred.reject(conflictResponse);
          $scope.$apply();

          expect(notificationServiceSpy).toHaveBeenCalledWith(messageKey);
          expect(stateSpy).toHaveBeenCalled();
        }

        function verifyNoReloadOnError(responseStatus) {
            var notificationServiceSpy = jasmine.createSpy(),
                stateSpy = jasmine.createSpy(),
                conflictResponse = { status: responseStatus };

            spyOn(notificationService, 'error').andCallFake(notificationServiceSpy);
            spyOn($state, 'reload').andCallFake(stateSpy);

            vm.syncRnr();

            deferred.reject(conflictResponse);
            $scope.$apply();

            expect(notificationServiceSpy).toHaveBeenCalledWith('requisitionView.sync.failure');
            expect(stateSpy).not.toHaveBeenCalled();
        }
    });

    describe('syncRnr', function() {

        it('should open loading modal once', function() {
            spyOn(loadingModalService, 'open');
            requisition.$save.andReturn($q.when(true));

            vm.syncRnr();
            $scope.$apply();

            expect(loadingModalService.open.calls.length).toEqual(1);
        });

    });

    describe('isFullSupplyTabValid', function() {

        var message;

        beforeEach(function() {
            message = 'some-message';
            spyOn(messageService, 'get').andReturn(message);
        });

        it('should return true if all line items are valid', function() {
            requisitionValidatorMock.areLineItemsValid.andCallFake(function(lineItems) {
                return lineItems[0] === fullSupplyItems[0];
            });

            expect(vm.isFullSupplyTabValid()).toBe(true);
            expect(requisitionValidatorMock.areLineItemsValid)
                .toHaveBeenCalledWith([fullSupplyItems[0]]);
            expect(vm.invalidFullSupply).toBe(undefined);
        });

        it('should return false if all line items are invalid', function() {
            requisitionValidatorMock.areLineItemsValid.andCallFake(function(lineItems) {
                return lineItems[0] !== fullSupplyItems[0];
            });

            expect(vm.isFullSupplyTabValid()).toBe(false);
            expect(requisitionValidatorMock.areLineItemsValid)
                .toHaveBeenCalledWith([fullSupplyItems[0]]);
            expect(vm.invalidFullSupply).toBe(message);
            expect(messageService.get).toHaveBeenCalledWith('requisitionView.requisition.error');
        });

    });

    describe('isNonFullSupplyTabValid', function() {

        var message;

        beforeEach(function() {
            message = 'some-message';
            spyOn(messageService, 'get').andReturn(message);
        });

        it('should return true if all line items are valid', function() {
            requisitionValidatorMock.areLineItemsValid.andCallFake(function(lineItems) {
                return lineItems[0] === nonFullSupplyItems[0];
            });

            expect(vm.isNonFullSupplyTabValid()).toBe(true);
            expect(requisitionValidatorMock.areLineItemsValid)
                .toHaveBeenCalledWith([nonFullSupplyItems[0]]);
            expect(vm.invalidNonFullSupply).toBe(undefined);
        });

        it('should return true if all line items are valid', function() {
            requisitionValidatorMock.areLineItemsValid.andCallFake(function(lineItems) {
                return lineItems[0] !== nonFullSupplyItems[0];
            });

            expect(vm.isNonFullSupplyTabValid()).toBe(false);
            expect(requisitionValidatorMock.areLineItemsValid)
                .toHaveBeenCalledWith([nonFullSupplyItems[0]]);
            expect(vm.invalidNonFullSupply).toBe(message);
            expect(messageService.get).toHaveBeenCalledWith('requisitionView.requisition.error');
        });
    });

    describe('authorize', function() {

        beforeEach(function() {
            confirmSpy.confirm.andReturn($q.when(true));
            requisition.$save.andReturn($q.when(true));
            requisition.$authorize.andReturn($q.when(true));

            requisitionValidatorMock.validateRequisition.andReturn(true);
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(false);
        });

        it('should redirect to previous state', function() {
            authorizationServiceSpy.hasRight.andReturn(false);
            spyOn($state, 'go');

            vm.authorizeRnr();
            $scope.$apply();

            expect(stateTrackerService.goToPreviousState).toHaveBeenCalledWith('openlmis.requisitions.initRnr');
        });

        it('should show notification if requisition has error', function() {
            requisitionValidatorMock.validateRequisition.andReturn(false);
            spyOn(notificationService, 'error');

            vm.authorizeRnr();
            $scope.$apply();

            expect(notificationService.error).toHaveBeenCalledWith('requisitionView.rnrHasErrors');
        });

        it('should show notification if all line items are skipped', function() {
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(true);
            spyOn(notificationService, 'error');

            vm.authorizeRnr();
            $scope.$apply();

            expect(notificationService.error).toHaveBeenCalledWith('requisitionView.allLineItemsSkipped');
        });
    });

    describe('submitRnr', function() {

        beforeEach(function() {
            confirmSpy.confirm.andReturn($q.when(true));
            requisition.$save.andReturn($q.when(true));
            requisition.$submit.andReturn($q.when(true));

            requisitionValidatorMock.validateRequisition.andReturn(true);
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(false);
        });

        it('should redirect to previous state', function() {
            authorizationServiceSpy.hasRight.andReturn(false);
            spyOn($state, 'go');

            vm.submitRnr();
            $scope.$apply();

            expect(stateTrackerService.goToPreviousState).toHaveBeenCalledWith('openlmis.requisitions.initRnr');
        });
    });

    describe('removeRnr', function() {

        beforeEach(function() {
            confirmSpy.confirmDestroy.andReturn($q.when(true));
            requisition.$save.andReturn($q.when(true));
            requisition.$remove.andReturn($q.when(true));

            requisitionValidatorMock.validateRequisition.andReturn(true);
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(false);
        });

        it('should redirect to previous state', function() {
            authorizationServiceSpy.hasRight.andReturn(false);
            spyOn($state, 'go');

            vm.removeRnr();
            $scope.$apply();

            expect(stateTrackerService.goToPreviousState).toHaveBeenCalledWith('openlmis.requisitions.initRnr');
        });
    });

    describe('approveRnr', function() {

        beforeEach(function() {
            confirmSpy.confirmDestroy.andReturn($q.when(true));
            requisition.$save.andReturn($q.when(true));
            requisition.$approve.andReturn($q.when(true));

            requisitionValidatorMock.validateRequisition.andReturn(true);
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(false);
        });

        it('should redirect to previous state', function() {
            authorizationServiceSpy.hasRight.andReturn(false);
            spyOn($state, 'go');

            vm.approveRnr();
            $scope.$apply();

            expect(stateTrackerService.goToPreviousState).toHaveBeenCalledWith('openlmis.requisitions.approvalList');
        });

        it('should show notification if requisition has error', function() {
            requisitionValidatorMock.validateRequisition.andReturn(false);
            spyOn(notificationService, 'error');

            vm.approveRnr();
            $scope.$apply();

            expect(notificationService.error).toHaveBeenCalledWith('requisitionView.rnrHasErrors');
        });
    });

    describe('rejectRnr', function() {

        var confirmDeferred, saveDeferred;

        beforeEach(function() {
            confirmDeferred = $q.defer();
            saveDeferred = $q.defer();

            confirmSpy.confirmDestroy.andReturn(confirmDeferred.promise);
            requisition.$save.andReturn(saveDeferred.promise);
            requisition.$reject.andReturn($q.when(true));

            requisitionValidatorMock.validateRequisition.andReturn(true);
            requisitionValidatorMock.areAllLineItemsSkipped.andReturn(false);
        });

        it('should save requisition before rejecting', function() {
            vm.rejectRnr();
            confirmDeferred.resolve();
            $scope.$apply();

            expect(requisition.$save).toHaveBeenCalled();
            expect(requisition.$reject).not.toHaveBeenCalled();

            saveDeferred.resolve();
            $scope.$apply();

            expect(requisition.$reject).toHaveBeenCalled();
        });

        it('should redirect to previous state', function() {
            authorizationServiceSpy.hasRight.andReturn(false);
            spyOn($state, 'go');

            vm.rejectRnr();
            confirmDeferred.resolve();
            saveDeferred.resolve();
            $scope.$apply();

            expect(stateTrackerService.goToPreviousState)
                .toHaveBeenCalledWith('openlmis.requisitions.approvalList');
        });
    });

    describe('syncAndPrint', function() {

        beforeEach(function() {
            spyOn($window, 'open').andCallThrough();
            authorizationServiceSpy.hasRight.andReturn(true);
            vm.requisition.$isInitiated.andReturn(true);
        });

        it('should open window with report when sync succeeded', function() {
            requisition.$save.andReturn($q.when(true));

            vm.syncRnrAndPrint();
            $scope.$apply();

            expect(accessTokenFactorySpy.addAccessToken)
                .toHaveBeenCalledWith('http://some.url/api/requisitions/1/print');
        });

        it('should not open report when sync failed', function() {
            requisition.$save.andReturn($q.reject());

            vm.syncRnrAndPrint();
            $scope.$apply();

            expect($window.open).toHaveBeenCalledWith('', '_blank');
            expect(accessTokenFactorySpy.addAccessToken).not.toHaveBeenCalled();
        });

        it('should display error message when sync failed', function() {
            requisition.$save.andReturn($q.reject({status: 400}));
            var notificationServiceSpy = jasmine.createSpy();
            spyOn(notificationService, 'error').andCallFake(notificationServiceSpy);

            vm.syncRnrAndPrint();
            $scope.$apply();

            expect(notificationServiceSpy).toHaveBeenCalledWith('requisitionView.sync.failure');
        });

        it('should open window with report when has no right for sync', function() {
            accessTokenFactorySpy.addAccessToken.andReturn('token');
            authorizationServiceSpy.hasRight.andReturn(false);

            vm.syncRnrAndPrint();

            expect($window.open).toHaveBeenCalledWith('token', '_blank');
        });

        it('should open loading modal once', function() {
            spyOn(loadingModalService, 'open');
            requisition.$save.andReturn($q.when(true));

            vm.syncRnrAndPrint();
            $scope.$apply();

            expect(loadingModalService.open.calls.length).toEqual(1);
        });
    });
});
