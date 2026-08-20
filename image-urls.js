// Image gallery configuration for the Howard Property map.
//
// Structure (same as the EcoVillage-map V1 stack):
//   export const IMAGE_URLS = {
//     '<zone-id>': {
//       current: ['/images/Zone%20Folder/current/photo.jpg', ...],
//       vision:  ['/images/...'] // or { 'Subcategory': ['/images/...'], ... }
//     },
//     'property': { current: ['/images/Property/...'] }
//   };
//
// Paths are URL-encoded and point at the repo's images/ folder.
// Empty for the initial layout release — add photos as zones are defined.

export const IMAGE_URLS = {
  'property': {
    current: []
  }
};
