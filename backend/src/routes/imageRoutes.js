import { Router } from 'express';
import * as images from '../controllers/imageController.js';
import { uploadImage } from '../middlewares/uploadMiddleware.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { imageIdParams, listImagesQuery, uploadImageBody } from '../validators/imageValidator.js';

// TODO(Phase 2): protect with JWT auth + roles once authentication exists.
const router = Router();

router.post('/', uploadImage, validate({ body: uploadImageBody }), images.uploadImage);
router.get('/', validate({ query: listImagesQuery }), images.listImages);
router.get('/:id', validate({ params: imageIdParams }), images.getImage);
router.get('/:id/file', validate({ params: imageIdParams }), images.getImageFile);
router.post('/:id/analyze', validate({ params: imageIdParams }), images.analyzeImage);
router.get('/:id/analysis', validate({ params: imageIdParams }), images.getAnalysis);
router.get('/:id/analysis/annotated', validate({ params: imageIdParams }), images.getAnnotatedImage);

export default router;
