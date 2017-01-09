const AWS = require('aws-sdk');
const fs = require('fs');
const q = require('q');

// The Names of the people we have registered in our profiles.
var profiles = ["michael", "emma"];

const rekognition = new AWS.Rekognition({
  region: "us-east-1"
});

var app = {}

/**
 * Create new AWS Rekognition Collection.
 * @param  {string} collectionName The Collection name
 * @return {void}
 */
app.createCollection = function(collectionName){
  var params = {
    CollectionId: collectionName.toString()
  };

  rekognition.createCollection(params, function(err, data){
    if(err){
      console.log(err, err.stack);
    } else {
      fs.writeFileSync("./log-createCollection-response.json", JSON.stringify(data));
      console.log(data);
    }
  });
};

/**
 * Read a training directory with images of a single person
 * and assign a name to those facial vectors.
 * @param  {string} collectionName The collection that was created earlier
 * @param  {string} trainingDir    The directory we are training with.
 * @param  {string} name           The name of the person we are training with.
 * @return {void}
 */
app.trainFaces = function(collectionName, trainingDir, name){
  var facesArray = [];
  var facesData = [];
  var readDir = trainingDir + name + "/";

  // Read Directory
  fs.readdir(readDir, function(err, files){
    files.forEach(function(filename){
      var ext = filename.substring(filename.lastIndexOf(".")+1);
      if(ext == "jpg"){
        facesArray.push(filename);
        console.log(filename);
      }
    });

    var awsIndexFace = function(faceData, collectionName, name, filename){
      var params = {
        CollectionId: collectionName,
        Image: {"Bytes": faceData},
        ExternalImageId: name
      };

      rekognition.indexFaces(params, function(err, data){
        if(err){ console.log(err, err.stack);
        } else {
          fs.writeFileSync("./log-indexFaces-response-" + filename + ".json", JSON.stringify(data));
          console.log(data)
        };
      });
    };

    // Loop through files, read them, and pass them to AWS.
    facesArray.forEach(function(filename){
      fs.readFile(readDir + filename, function(err, data){
        if(err) console.log(err);
        facesData.push(data);
        awsIndexFace(data, collectionName, name, filename);
      });
    });
  });
};

/**
 * Determine whether a face is associated with a profile.
 * @param  {string} collectionName The collection that was created earlier.
 * @param  {string} imagePath      The path of the image we are checking against.
 * @return {promise}
 */
app.searchFace = function(collectionName, imagePath){
  var deferred = q.defer();

  fs.readFile(imagePath, (error, data) => {
    if(error) console.log(error);

    var doesMatchProfile = (data) => {
      var faceMatches = data.FaceMatches;
      var faceId = faceMatches[0].Face.ExternalImageId;
      if( profiles.indexOf(faceId) != -1){
        return { matches: true, faceId: faceId };
      } else {
        return { matches: false };
      }
    }

    var params = {
      CollectionId: collectionName,
      Image: {
        "Bytes": data
      },
      MaxFaces: 1
    };

    rekognition.searchFacesByImage(params, (err, data) =>{
      if(err) {
        console.log(err);
      } else {
        fs.writeFileSync("./log-searchFacesByImage-response.json", JSON.stringify(data));
        var matches = doesMatchProfile(data);
        if( matches.matches === true ){
          deferred.resolve(matches.faceId);
        } else {
          deferred.reject(false);
        }
      }
    });
  });
  return deferred.promise
}

// app.createCollection("reflection");
// app.trainFaces("reflection", "./training/", "michael");
// app.trainFaces("reflection", "./training/", "emma");
var who = app.searchFace("reflection", "./training/test/emma/profile-test.jpg");
who.then(function(whodis){
  console.log(whodis);
});
