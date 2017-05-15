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
     * @ngdoc service
     * @name requisition-calculations.calculationFactory
     *
     * @description
     * Responsible for storing all the calculations related with the line item and product grid.
     */
    angular
    .module('requisition-calculations')
    .factory('calculationFactory', factory);

    factory.$inject = ['TEMPLATE_COLUMNS', 'COLUMN_SOURCES', '$filter'];

    function factory(TEMPLATE_COLUMNS, COLUMN_SOURCES, $filter) {
        var A = TEMPLATE_COLUMNS.BEGINNING_BALANCE,
        B = TEMPLATE_COLUMNS.TOTAL_RECEIVED_QUANTITY,
        C = TEMPLATE_COLUMNS.TOTAL_CONSUMED_QUANTITY,
        D = TEMPLATE_COLUMNS.TOTAL_LOSSES_AND_ADJUSTMENTS,
        E = TEMPLATE_COLUMNS.STOCK_ON_HAND,
        H = TEMPLATE_COLUMNS.MAXIMUM_STOCK_QUANTITY,
        J = TEMPLATE_COLUMNS.REQUESTED_QUANTITY,
        K = TEMPLATE_COLUMNS.APPROVED_QUANTITY,
        N = TEMPLATE_COLUMNS.ADJUSTED_CONSUMPTION,
        M = TEMPLATE_COLUMNS.CALCULATED_ORDER_QUANTITY,
        P = TEMPLATE_COLUMNS.AVERAGE_CONSUMPTION,
        Q = TEMPLATE_COLUMNS.TOTAL_COST,
        T = TEMPLATE_COLUMNS.PRICE_PER_PACK,
        V = TEMPLATE_COLUMNS.PACKS_TO_SHIP,
        Y = TEMPLATE_COLUMNS.TOTAL;

        var calculationFactory = {
            calculatedOrderQuantity: calculateOrderQuantity,
            totalConsumedQuantity: calculateTotalConsumedQuantity,
            stockOnHand: calculateStockOnHand,
            totalLossesAndAdjustments: calculateTotalLossesAndAdjustments,
            total: calculateTotal,
            packsToShip: calculatePacksToShip,
            totalCost: calculateTotalCost,
            adjustedConsumption: calculateAdjustedConsumption,
            maximumStockQuantity: calculateMaximumStockQuantity,
            averageConsumption: calculateAverageConsumption
        };
        return calculationFactory;

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name totalConsumedQuantity
         *
         * @description
         * Calculates the value of the Total Consumed Quantity column based on the given line item.
         *
         * @param  {Object} lineItem the line item to calculate the value from
         * @return {Number}          the calculated Total Consumed Quantity value
         */
        function calculateTotalConsumedQuantity(lineItem, requisition) {
            return lineItem[A] + lineItem[B] + lineItem[D] - lineItem[E];
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name stockOnHand
         *
         * @description
         * Calculates the value of the Stock On Hand column based on the given line item.
         *
         * @param  {Object} lineItem the line item to calculate the value from
         * @return {Number}          the calculated Stock On Hand value
         */
        function calculateStockOnHand(lineItem) {
            return lineItem[A] + lineItem[B] - lineItem[C] + lineItem[D];
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name total
         *
         * @description
         * Calculates the value of the Total column based on the given line item.
         *
         * @param  {Object} lineItem the line item to calculate the value from
         * @return {Number}          the calculated Total value
         */
        function calculateTotal(lineItem) {
            return lineItem[A] + lineItem[B];
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name totalLossesAndAdjustments
         *
         * @description
         * Calculates the value of the Total Losses and Adjustments column based on the given line item and adjustment reasons.
         *
         * @param  {Object} lineItem               the line item to calculate the value from
         * @param  {List}   stockAdjustmentReasons the list of stock adjustment reasons
         * @return {Number}                        the calculated Total Losses and Adjustments value
         */
        function calculateTotalLossesAndAdjustments(lineItem, stockAdjustmentReasons) {
            var total = 0;
            angular.forEach(lineItem.stockAdjustments, function(adjustment) {
                var filteredReasons = $filter('filter')(stockAdjustmentReasons, {id: adjustment.reasonId}, true);
                var reason = (filteredReasons) ? filteredReasons[0] : null;
                if (!!reason) {
                    if (reason.additive === true) {
                        total += adjustment.quantity;
                    } else {
                        total -= adjustment.quantity;
                    }
                }
            });
            return total;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name packsToShip
         *
         * @description
         * Calculates the value of the Packs to Ship column based on the given line item and requisition status.
         *
         * @param  {Object} lineItem    the line item to calculate the value from
         * @param  {Object} requisition the requisition
         * @return {Number}             the calculated Packs to Ship value
         */
        function calculatePacksToShip(lineItem, requisition) {
            var orderQuantity = getOrderQuantity(lineItem, requisition),
            netContent = lineItem.orderable.netContent;

            if (!orderQuantity || !netContent) {
                return 0;
            } else {
                var remainderQuantity = orderQuantity % netContent,
                packsToShip = (orderQuantity - remainderQuantity) / netContent;

                if (remainderQuantity > 0 && remainderQuantity > lineItem.orderable.packRoundingThreshold) {
                    packsToShip += 1;
                }

                if (packsToShip === 0 && !lineItem.orderable.roundToZero) {
                    packsToShip = 1;
                }

                return packsToShip;
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name calculateTotalCost
         *
         * @description
         * Calculates the total cost by multiplying price per pack and packs to ship.
         *
         * @param  {Object} lineItem the line item to get the values from
         * @param  {Object} requisition the requisition
         * @return {Number}          the total cost of this line item
         */
        function calculateTotalCost(lineItem, requisition) {
            var packsToShip = this.packsToShip(lineItem, requisition);
            var pricePerPack = lineItem[T];
            if (pricePerPack === undefined) {
                pricePerPack = 0;
            }

            return pricePerPack * packsToShip;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name adjustedConsumption
         *
         * @description
         * Calculates the value of the Adjusted Consumption column based on the given line item. If
         * consumed quantity is calculated, the calculated value will be used.
         *
         * @param  {Object} lineItem    the line item to calculate the value from
         * @param  {Object} requisition the requisition with required period
         * @return {Number}             the calculated Adjusted Consumption value
         */
        function calculateAdjustedConsumption(lineItem, requisition) {
            var cColumn = requisition.template.getColumn(C),
                consumedQuantity = getColumnValue(lineItem, requisition, cColumn);

            if (consumedQuantity === undefined) {
                return 0;
            }

            var totalDays = 30 * requisition.processingPeriod.durationInMonths;
            var stockoutDays = lineItem.totalStockoutDays === undefined ? 0: lineItem.totalStockoutDays;
            var nonStockoutDays = totalDays - stockoutDays;
            if (nonStockoutDays === 0) {
                return consumedQuantity;
            }

            var adjustedConsumption = Math.ceil(consumedQuantity * (totalDays / nonStockoutDays));
            return adjustedConsumption;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name averageConsumption
         *
         * @description
         * Calculates the value of the Average Consumption column based on the given line item.
         *
         * @param  {Object} lineItem    the line item to calculate the value from
         * @param  {Object} requisition the requisition with required period
         * @return {Number}             the calculated Average Consumption value
         */
        function calculateAverageConsumption(lineItem, requisition) {
            var adjustedConsumptions = angular.copy(lineItem.previousAdjustedConsumptions);
            adjustedConsumptions.push(calculateAdjustedConsumption(lineItem, requisition));

            var numberOfPeriods = adjustedConsumptions.length;

            //if there is no previous adjusted consumption
            if (numberOfPeriods === 1) {
                return adjustedConsumptions[0];
            }
            //if there is only one previous adjusted consumption
            else if (numberOfPeriods === 2) {
                return Math.ceil((adjustedConsumptions[0] + adjustedConsumptions[1])/2);
            }
            //if more than one previous adjusted consumption
            else {
                var sum = 0;
                adjustedConsumptions.forEach(function (adjustedConsumption) {
                    sum += adjustedConsumption;
                });
                return Math.ceil(sum / numberOfPeriods);
            }
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name getOrderQuantity
         * @private
         *
         * @description
         * Returns the value of the order quantity based on the requisition status.
         *
         * @param  {Object} lineItem    the line item to get the order quantity from
         * @param  {String} requisition the requisition with required status
         * @return {Number}             the value of the order quantity
         */
        function getOrderQuantity(lineItem, requisition) {
            var orderQuantity = null;

            if (requisition.$isAfterAuthorize()) {
                orderQuantity = lineItem[K];
            } else {
                var jColumn = requisition.template.getColumn(J),
                    mColumn = requisition.template.getColumn(M);

                if (shouldReturnRequestedQuantity(lineItem, jColumn)) {
                    orderQuantity = lineItem[J];
                } else if (mColumn) {
                    orderQuantity = calculateOrderQuantity(lineItem, requisition);
                }
            }

            return orderQuantity;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name maximumStockQuantity
         *
         * @description
         * Calculates the value of the Maximum Stock Quantity column based on the given line item.
         *
         * @param  {Object} lineItem    the line item to get the order quantity from
         * @param  {String} requisition the requisition with template
         * @return {Number}             the calculated Maximum Stock Quantity value
         */
        function calculateMaximumStockQuantity(lineItem, requisition) {
            var hColumn = requisition.template.getColumn(H),
                pColumn = requisition.template.getColumn(P),
                pValue;

            if (pColumn) {
                pValue = getColumnValue(lineItem, requisition, pColumn);
            }

            return hColumn && hColumn.option.optionName === 'default' ?
                Math.round(pValue * lineItem.maxPeriodsOfStock) : 0;
        }

        /**
         * @ngdoc method
         * @methodOf requisition-calculations.calculationFactory
         * @name calculatedOrderQuantity
         *
         * @description
         * Calculates the value of the Calculated Order Quantity column.
         *
         * @param  {Object} lineItem    the line item to calculate the value for
         * @param  {Object} requisition the requisition used with calculation
         * @return {Number}             the calculated order quantity
         */
        function calculateOrderQuantity(lineItem, requisition) {
            var eColumn = requisition.template.getColumn(E),
                hColumn = requisition.template.getColumn(H);

            if (!eColumn || !hColumn) return null;

            var stockOnHand = getColumnValue(lineItem, requisition, eColumn),
                maximumStockQuantity = getColumnValue(lineItem, requisition, hColumn);

            return Math.max(maximumStockQuantity - stockOnHand, 0);
        }

        function getColumnValue(lineItem, requisition, column) {
            if (column.source === COLUMN_SOURCES.CALCULATED) {
                return calculationFactory[column.name](lineItem, requisition);
            }
            return lineItem[column.name];
        }

        function shouldReturnRequestedQuantity(lineItem, jColumn) {
            return lineItem.isNonFullSupply() || (isDisplayed(jColumn) && isFilled(lineItem[J]));
        }

        function isFilled(value) {
            //We want to treat 0 as a valid value thus not using return value
            return value !== null && value !== undefined;
        }

        function isDisplayed(column) {
            return column && column.$display;
        }
    }
})();
