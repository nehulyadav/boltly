(function(){
  'use strict';

  angular.module('app')
         .controller('BottomSheetCtrl', ($scope, $mdBottomSheet) => {

    $scope.newConnection = "";

    $scope.createNewConnection = () => {
      let connectionObj = {
        url:$scope.newConnection,
        incomingHistory:[],
        outgoingHistory:[{test:"wow"},{test:"wow2"}],
        trackedEvents:[]
      };
      $mdBottomSheet.hide(connectionObj);
    };
  });
})();