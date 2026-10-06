const qaWorkspaceService = require('../services/qaWorkspace.service');
const { success } = require('../utils/responseBuilder');

const qaWorkspaceController = {
  async getWorkspace(req, res, next) {
    try {
      const { binId } = req.params;
      const data = await qaWorkspaceService.getWorkspace(binId);
      res.status(200).json(success(data));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = qaWorkspaceController;
