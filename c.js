#!/usr/bin/env node
const fetch = require('node-fetch');
const shortcutToken = 'YOUR_SHORTCUT_TOKEN';
const execSync = require('child_process').execSync;
const query = require('cli-interact').getInteger;

function titleCase(str) {
  var splitStr = str.toLowerCase().split(' ');
  for (var i = 0; i < splitStr.length; i++) {
    splitStr[i] = splitStr[i].charAt(0).toUpperCase() + splitStr[i].substring(1);
  }

  return splitStr.join(' ');
}

function formatStoryName(storyName, storyId, storyType) {
  let storyNameTrimmed = storyName;

  storyNameTrimmed = storyNameTrimmed.replaceAll('update', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('use', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('always', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('fix', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('do ', ' ');
  storyNameTrimmed = storyNameTrimmed.replaceAll('not ', ' ');
  storyNameTrimmed = storyNameTrimmed.replaceAll('error', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll(':', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('`', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('\'', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('\'', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('[', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll(']', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('"', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('\'', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('investigate', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('referenceerror', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('the', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('npm', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('package', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('remove', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('accessing', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('set ', ' ');
  storyNameTrimmed = storyNameTrimmed.replaceAll('initial', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('issue', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('with', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('of ', ' ');
  storyNameTrimmed = storyNameTrimmed.replaceAll('replace ', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('Replace ', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('*', '');
  storyNameTrimmed = storyNameTrimmed.replaceAll('to ', ' ');
  storyNameTrimmed = storyNameTrimmed.replaceAll('----', '-');
  storyNameTrimmed = storyNameTrimmed.replaceAll('---', '-');
  storyNameTrimmed = storyNameTrimmed.replaceAll('--', '-');

  var shortStoryName = storyNameTrimmed.substring(0, 10);
  shortStoryName = shortStoryName.replaceAll('--', '-');
  shortStoryName = shortStoryName.replaceAll('"', '');

  var storyTicketName = storyName.replaceAll('-', ' ');
  storyTicketName = storyTicketName.replaceAll('"', ' ');

  var storyTypes = {
    'bug': {
      branch: 'fix',
      ticket: 'fix'
    },
    'feature': {
      branch: 'feature',
      ticket: 'feat'
    },
    'chore': {
      branch: 'chore',
      ticket: 'chore'
    }
  };

  const storyMappedType = storyTypes[storyType];

  const branch = `${storyMappedType.branch}/${storyId}-${shortStoryName.toLowerCase()}`;
  const ticket = `${storyMappedType.ticket}: ${storyId} ${titleCase(storyTicketName)}`;

  return {
    branch, ticket
  };
}

function call(command) {
  try {
    const result = execSync(command, { stdio : 'pipe' });
    return result.toString().trim();
  } catch (ex) {
    return ex;
  }
}

function silentCall(command) {
  const response = call(command);
  const success = !response.toString().includes('Error');
  if (!success) {
    throw response;
  }

  return success;
}

async function getStories(query) {
  const url = 'https://api.app.shortcut.com/api/v3/search/stories';

  const settings = {
    headers: {
      'Shortcut-Token': shortcutToken
    }
  };
  const params = new URLSearchParams(query);
  return fetch(`${url}?${params}`, settings)
    .then(res => res.json()).then(res => res.data);
}

function doesBranchExist(branch) {
  return /^[A-Za-z0-9]*$/.test(
    call(`git rev-parse --verify ${branch}`)
  );
}

async function process() {
  const stories = await getStories({ page_size: 1,
    query: 'owner:tomaszsmykowski state:"In Progress"' });

  console.log('');
  stories.forEach((story, index) => {
    console.log(`${index + 1}: ${story.id} ${story.name}`);
  });
  console.log('');

  const response = query('What ticket to switch to? ');

  if (response !== 0) {
    const selectedStory = stories[response - 1];
    const formattedNames = formatStoryName(selectedStory.name,
      selectedStory.id, selectedStory.story_type);

    if (doesBranchExist(formattedNames.branch)) {
      silentCall(`git checkout "${formattedNames.branch}"`);
    } else {
      try {
        silentCall('git checkout staging');
        silentCall('git pull');
        silentCall(`git checkout -b "${formattedNames.branch}"`);
        silentCall(`git push --set-upstream origin "${formattedNames.branch}"`);
      } catch (e) {
        console.log(e);
      }
    }

    console.log(`Switched to ${selectedStory.name}`);
  }
}

process();
