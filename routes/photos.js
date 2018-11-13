const express    = require("express"),
      router     = express.Router(),
      Photo = require("../models/photo"),
      middleware = require("../middleware"), // automatically looks for index.js
      geo   = require("google-geocoder"),
      multer     = require('multer'),
      cloudinary = require('cloudinary');

var geocoder = geo({
  key: 'AIzaSyDBcONMAuzfwgOybANRISmmHgYalCNz3AM'
});
// =========== Image Upload Configuration =============
//multer config
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter});

// cloudinary config
cloudinary.config({ 
  cloud_name: 'dr2fpjn9k', 
  api_key: 913726914577157, 
  api_secret: "fqF6YmicO9bjwSyKu4Awa9PYz3Q"
});

// ============= ROUTES ==============
// Define escapeRegex function to avoid regex DDoS attack
const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

// INDEX -show all photos
router.get("/", (req, res) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Photo.find({name: regex}, function(err, allPhotos) {
      if (err) { console.log(err); }
      else {
        if (allPhotos.length < 1) {
          noMatch = "No photos found, please try again.";
        }
        res.render("photos/index", { photos: allPhotos, page: "photos", noMatch: noMatch });  
      }
    });
  } else {
    // Get all camgrounds from DB
    Photo.find({}, function(err, allPhotos) {
      if (err) { console.log(err); }
      else {
        res.render("photos/index", { photos: allPhotos, page: "photos", noMatch: noMatch });  
      }
    }); 
  }
});

// CREATE - add new photo to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // cloudinary
  cloudinary.uploader.upload(req.file.path, (result) => {
     // get data from the form
    let { name, image, price, description, author } = { 
      name: req.body.name,
      image: {
        // add cloudinary public_id for the image to the photo object under image property
        id: result.public_id,
        // add cloudinary url for the image to the photo object under image property
        url: result.secure_url
      },
      price: req.body.price,
      description: req.body.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
  
    // geocoder for Google Maps
    geocoder.find(req.body.location, (err, data) => {
      if (err) throw err;
      console.log("Reults for geo code:\n")
      console.log(data);
      
      let lat = data[0].location.lat,
          lng = data[0].location.lng,
          location = data[0].formatted_address;
      let newPhoto = { name, image, price, description, author, location, lat, lng };
    
      // create a new photo and save to DB
      Photo.create(newPhoto, (err, newlyCreated) => {
        if (err) { console.log(err); }
        else {
          // redirect back to photo page
          res.redirect("/photos");
        }
      });
    });
  });
});

// NEW
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("photos/new"));

// SHOW - shows more info about one photo
router.get("/:id", (req, res) => {
  //find the photo with provided id in DB
  Photo.findById(req.params.id).populate("comments").exec((err, foundPhoto) => {
    if (err || !foundPhoto) {
      req.flash("error", "Photo not found");
      res.redirect("back");
    } else {
      //render show template with that photo
      res.render("photos/show", { photo: foundPhoto });
    }
  });
});

// edit photo route
// store original image id and url
let imageId, imageUrl;
router.get("/:id/edit", middleware.checkPhotoOwenership, (req, res) => {
  Photo.findById(req.params.id, (err, foundPhoto) => {
    imageId = foundPhoto.image.id;
    imageUrl = foundPhoto.image.url;
    if (err) { res.redirect("/photos") }
    else { res.render("photos/edit", { photo: foundPhoto }); } 
  });
});

// update photo route
router.put("/:id", middleware.checkPhotoOwenership, upload.single('image'), (req, res) => {
  // if no new image to upload
  if (!req.file) {
    let { name, image, price, description, author } = { 
      name: req.body.photo.name,
      image: {
        // add cloudinary public_id for the image to the photo object under image property
        id: imageId,
        // add cloudinary url for the image to the photo object under image property
        url: imageUrl
      },
      price: req.body.photo.price,
      description: req.body.photo.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
    geocoder.find(req.body.photo.location, (err, data) => {
      if (err) throw err;
      let lat = data[0].location.lat,
          lng = data[0].location.lng,
          location = data[0].formatted_address;
      let newData = { name, image, price, description, author, location, lat, lng };
      
      //find and update the correct photo
      Photo.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedPhoto) => {
        if (err) {
          req.flash("error", err.message);
          res.redirect("/photos");
        } else {
          //redirect somewhere(show page)
          req.flash("success","Photo Updated!");
          res.redirect("/photos/" + req.params.id);
        }
      });
    });
  } else {
    // cloudinary
    cloudinary.uploader.upload(req.file.path, (result) => {
      let { name, image, price, description, author } = { 
        name: req.body.photo.name,
        image: {
          // add cloudinary public_id for the image to the photo object under image property
          id: result.public_id,
          // add cloudinary url for the image to the photo object under image property
          url: result.secure_url
        },
        price: req.body.photo.price,
        description: req.body.photo.description,
        // get data from the currenly login user
        author: {
          id: req.user._id,
          username: req.user.username
        }
      };
      
      // remove original/old photo image on cloudinary
      cloudinary.uploader.destroy(imageId, (result) => { console.log(result) });
      
      geocoder.find(req.body.photo.location, (err, data) => {
        if (err) throw err;
        let lat = data[0].geometry.location.lat,
            lng = data[0].geometry.location.lng,
            location = data[0].formatted_address;
        let newData = { name, image, price, description, author, location, lat, lng };
        
        //find and update the correct photo
        Photo.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedPhoto) => {
          if (err) {
            req.flash("error", err.message);
            res.redirect("/photos");
          } else {
            //redirect somewhere(show page)
            req.flash("success","Photo Updated!");
            res.redirect("/photos/" + req.params.id);
          }
        });
      });
    });
  }
});

// destroy photo route
router.delete("/:id", middleware.checkPhotoOwenership, (req, res) => {
  Photo.findByIdAndRemove(req.params.id, err => {
    if (err) { res.redirect("/photos"); }
    else {
      req.flash("success", "Photo removed!");
      res.redirect("/photos"); }
  });
});

module.exports = router;
