(function() {
    'use strict';

    let mod = angular.module('app');

    mod.controller('ConnectionsController', [
        '$scope', '$mdSidenav', '$mdBottomSheet', '$log', 'pouchDB', 'socket',
        ConnectionsController
    ]);

    function ConnectionsController($scope, $mdSidenav, $mdBottomSheet, $log, pouchDB, socket) {
        let db = pouchDB("local");
        /*
        LATER ADD SYNC CODE
        */

        $scope.format = str => {
          try {
              return JSON.stringify(str,undefined,2);
          }
          catch (e) { }

          return str;
        }

        $scope.remove = (index, $event) => {
            db.get($scope.connections[index]._id)
              .then((doc) => {
                db.remove(doc);
              })
              .catch(err => $log.error(err));

            // Prevent bubbling to item.
            // On recent browsers, only $event.stopPropagation() is needed
            if ($event.stopPropagation) $event.stopPropagation();
            if ($event.preventDefault) $event.preventDefault();
            $event.cancelBubble = true;
            $event.returnValue = false;
        }

        $scope.connections = [];
        $scope.sockets = [];
        $scope.tabs = {
            hovered:[],
            selectedIndex: 0,
            next: () => $scope.tabs.selectedIndex = Math.min($scope.tabs.selectedIndex + 1, 2),
            previous: () => $scope.tabs.selectedIndex = Math.max($scope.tabs.selectedIndex - 1, 0)
        };

        $scope.hoverIn = i => $scope.tabs.hovered[i] = true;
        $scope.hoverOut = i => $scope.tabs.hovered[i] = false;
        $scope.toggleHistory = () => $mdSidenav('left').toggle();

        $scope.addEvent = (evt, i) => {
          let now = new Date();
          let storeIncomingHistory = (evt,data) => {
              db.get($scope.connections[i]._id).then(function(doc) {
              doc.incomingHistory.push({"event":evt,"msg":data, "receivedAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
              return db.put(doc);
            }).then(function(response) {
            }).catch(function (err) {
              if (err.status === 409) {
                storeIncomingHistory(evt,data);
              }else{
                $log.error(err);
              }
            });
          };
          $scope.sockets[i].on(evt, data => {
            $scope.connections[i].incomingHistory.push({"event":evt,"msg":data, "recievedAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
            storeIncomingHistory(evt, data);
          });

          let storeTrackedEvents = evt => {
            db.get($scope.connections[i]._id).then(function(doc) {
              doc.trackedEvents.push(evt);
              return db.put(doc);
            }).then(function(response) {
            }).catch(function (err) {
              if (err.status === 409) {
                storeTrackedEvents(evt);
              }else {
                $log.error(err);
              }
            });
          };
          storeTrackedEvents(evt);
        }
        $scope.removeEvent = (evt, i) => {
          $scope.sockets[i].removeAllListeners(evt);
          let storeRemoveEvent = () => {
            db.get($scope.connections[i]._id).then(function(doc) {
              doc.trackedEvents.splice(doc.trackedEvents.indexOf(evt),1);
              return db.put(doc);
            }).then(function(response) {
            }).catch(function (err) {
              if(err.status == 409){
                storeRemoveEvent();
              }else{
                $log.error(err);
              }
            });
          };
          storeRemoveEvent();
        }

        $scope.changeTheme = () => {
          var classes = document.querySelector("body").classList;

          if(classes.contains("dark-theme")) {
            classes.add("light-theme");
            classes.remove("dark-theme");
            document.querySelector("#theme_instr").innerHTML = "Switch to dark theme";
          } else if(classes.contains("light-theme")) {
            classes.add("dark-theme");
            classes.remove("light-theme");
            document.querySelector("#theme_instr").innerHTML = "Switch to light theme";
          }
        }

        $scope.sendMessage = (evt, msg, i) => {
          let send = msg;
          try {
              send = JSON.parse(msg);
          }
          catch (e) { }
          $scope.sockets[i].emit(evt, send);
          let now = new Date();
          $scope.connections[i].outgoingHistory.unshift({"event":evt, "msg":msg, "sentAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
          let storeOutgoingHistory = () => {
            db.get($scope.connections[i]._id).then(function(doc) {
              doc.outgoingHistory.unshift({"event":evt, "msg":msg, "sentAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
              return db.put(doc);
            }).then(function(response) {
            }).catch(function (err) {
              if(err.status == 409){
                storeOutgoingHistory();
              }else{
                $log.error(err);
              }
            });
          };
          storeOutgoingHistory();

          // Reset Send Message UI UI
          $scope.connections[$scope.tabs.selectedIndex].currentMsgEvent = "";
          $scope.connections[$scope.tabs.selectedIndex].currentMsgBody = "";
        }

        let addToConnections = res => db.post(res);
        $scope.showListBottomSheet = () => {
            $mdBottomSheet.show({
                    templateUrl: 'views/add-connection-bottom-sheet.html',
                    controller: 'BottomSheetCtrl'
                })
                // .then(db.post)
                // .then(get)
                .then(addToConnections)
                .catch($log.error);
        };

        let onChange = (change) => {
          let index = $scope.connections.findIndex((connection, index, array) => change.change.id === connection._id);
          if(!change.change.deleted){
            if(index == -1){
              let tempSocket = new socket(change.change.doc.url);
              tempSocket.connected = false;

              tempSocket.on('connect',function() {
                $log.info(' [Socket.io] Client has connected to: ' + change.change.doc.url);
                tempSocket.connected = true;
              });
              tempSocket.on('disconnect',function() {
                $log.info(' [Socket.io] The client has disconnected from: ' + change.change.doc.url);
                tempSocket.connected = false;
              });

              var now = new Date();
              for (let evt of change.change.doc.trackedEvents) {
                let storeTrackedEvents = (evt, data) => {
                  db.get(change.change.doc._id).then(function(doc) {
                    doc.incomingHistory.push({"event":evt,"msg":data, "receivedAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
                    return db.put(doc);
                  }).then(function(response) {
                  }).catch(function (err) {
                    if(err.status == 409){
                      storeTrackedEvents(evt, data);
                    }else{
                      $log.error(err);
                    }
                  });
                }
                tempSocket.on(evt, data => {
                  change.change.doc.incomingHistory.push({"event":evt,"msg":data, "receivedAt":now.toLocaleTimeString() + " " + now.toLocaleDateString()});
                  storeTrackedEvents(evt,data);
                });
              }

              $scope.sockets.push(tempSocket);
              $scope.tabs.hovered.push(false);
              $scope.connections.push(change.change.doc);
            }
          }else {
            if(index != -1){
              $scope.connections.splice(index, 1);
              $scope.sockets[index].disconnect();
              $scope.sockets.splice(index, 1);
              $scope.tabs.hovered.splice(index, 1);
            }
          }
        }

        $scope.setMsg = (outgoingHistoryObject) => {
          let msg = outgoingHistoryObject.msg;
          if(typeof outgoingHistoryObject.msg == "object"){
            msg = JSON.stringify(msg, null, 2);
          }

          $scope.connections[$scope.tabs.selectedIndex].currentMsgEvent = outgoingHistoryObject.event;
          $scope.connections[$scope.tabs.selectedIndex].currentMsgBody = msg;
        }

        let options = { include_docs: true, live: true };
        db.changes(options).$promise
          .then(function(wow){console.dir(wow)}, function(wow){console.dir(wow)}, onChange);
    }
})();
