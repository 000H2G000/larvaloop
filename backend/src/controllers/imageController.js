import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import * as imageService from '../services/imageService.js';

const sendStoredFile = (res, { absolutePath, mimeType }) => {
  // Helmet defaults to same-origin; the dashboard on another port must be able to display these.
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.type(mimeType).sendFile(absolutePath);
};

export const uploadImage = asyncHandler(async (req, res) => {
  const image = await imageService.createImage({ file: req.file, ...req.body });
  ApiResponse.created(res, image, 'Image uploaded');
});

export const listImages = asyncHandler(async (req, res) => {
  const { items, total } = await imageService.listImages(req.query);
  ApiResponse.paginated(res, items, { page: req.query.page, limit: req.query.limit, total });
});

export const getImage = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await imageService.getImage(req.params.id));
});

export const getImageFile = asyncHandler(async (req, res) => {
  sendStoredFile(res, await imageService.getImageFile(req.params.id));
});

export const analyzeImage = asyncHandler(async (req, res) => {
  const analysis = await imageService.startAnalysis(req.params.id);
  ApiResponse.send(res, { statusCode: 202, message: 'Analysis started', data: analysis });
});

export const getAnalysis = asyncHandler(async (req, res) => {
  ApiResponse.ok(res, await imageService.getLatestAnalysis(req.params.id));
});

export const getAnnotatedImage = asyncHandler(async (req, res) => {
  sendStoredFile(res, await imageService.getAnnotatedFile(req.params.id));
});
