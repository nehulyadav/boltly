(function(){
  'use strict';

  class PouchDBService {
    constructor(){
        this.db = new PouchDB('local');
    }

    load() {
      //TODO: Need to load from PouchDB
      return Promise.resolve(/*POUCHDB LOAD CALL GOES HERE*/);
    }


  }

  angular.module('app').service('PouchDBService', PouchDBService);

})();
