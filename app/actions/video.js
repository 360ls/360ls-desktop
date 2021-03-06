import { v4 } from 'uuid';
import * as api from '../api';
import {
  REQUEST_FILE,
  RECEIVE_FILE,
  STARTED_CONVERSION,
  FINISHED_CONVERSION,
} from '../services/signals';
import {
  requestFile,
  reportError,
} from '../services/ipc';
import {
  ADD_VIDEO_REQUEST,
  ADD_VIDEO_SUCCESS,
} from './videos';

export const UPLOAD_VIDEO_REQUEST = 'UPLOAD_VIDEO_REQUEST';
export const UPLOAD_VIDEO_SUCCESS = 'UPLOAD_VIDEO_SUCCESS';
export const UPLOAD_VIDEO_FAILURE = 'UPLOAD_VIDEO_FAILURE';

export const startConversion = () => ({
  type: STARTED_CONVERSION,
});

export const finishConversion = () => ({
  type: FINISHED_CONVERSION,
});

export const requestVideo = (videoPath) => {
  requestFile(videoPath);
  return ({
    type: REQUEST_FILE,
  });
};

export const receiveVideo = (video) => ({
  type: RECEIVE_FILE,
  video,
});

const createVideo = (id, uri, location) => {
  const today = new Date();

  let dd = today.getDate();
  let mm = today.getMonth() + 1;
  const yyyy = today.getFullYear();
  const hour = today.getHours();
  let minutes = today.getMinutes();

  if (dd < 10) {
    dd = `0${dd}`;
  }

  if (mm < 10) {
    mm = `0${mm}`;
  }

  if (minutes < 10) {
    minutes = `0${minutes}`;
  }

  const date = `${mm}/${dd}/${yyyy}`;
  const timestamp = `${hour}:${minutes}`;
  const name = `Recording-${timestamp}`;

  const video = {
    id,
    date,
    flagged: false,
    location,
    name,
    uploaded: true,
    uri,
  };

  return video;
};

export const uploadVideo = (dispatch, fileName, data, location) => {
  dispatch({
    type: UPLOAD_VIDEO_REQUEST,
  });

  return api.uploadVideo(fileName, data)
    .then(() => api.getSharedLink(fileName))
    .then(res => {
      dispatch({
        type: UPLOAD_VIDEO_SUCCESS,
        link: res.url,
      });
      return res.url;
    })
    .then(url => {
      dispatch({
        type: ADD_VIDEO_REQUEST,
      });

      const video = createVideo(v4(), url, location);
      return api.addVideoEntry(video);
    })
    .then(response => {
      dispatch({
        type: ADD_VIDEO_SUCCESS,
      });

      return response;
    })
    .catch((err) => {
      reportError(err);
    });
};
