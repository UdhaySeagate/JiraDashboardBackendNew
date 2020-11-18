/**
 * Utility file
 */
const RequestParams = [
  'projectIdOrKey',
  'boardId',
  'versionId',
  'sprintId',
  'sprints',
  'components',
  'createdDate',
  'endDate',
  'selectedSprints',
  'selectedComponents'
];

const SuccessResponse = async data => {
  const success = Object.assign({
    status: 'success',
    statusCode: '200',
    data
  });
  return success;
};

const ErrorResponse = async data => {
  const error = Object.assign({
    status: 'error',
    statusCode: data.statusCode,
    data: data.body
  });
  return error;
};

module.exports = {
  RequestParams,
  SuccessResponse,
  ErrorResponse
};
