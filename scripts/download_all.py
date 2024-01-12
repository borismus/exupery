#!/usr/bin/env python
"""Downloads a fixed number of examples for each label that exists."""
import json
import os
import re
import requests
import subprocess
import sys

QUICKDRAW_ROOT = \
    'https://storage.googleapis.com/quickdraw_dataset/full/raw'
PREVIEW_BYTES = 100000

def RunCommand(command):
  with open(os.devnull, 'w') as devnull:
    return subprocess.check_output(command, shell=True, stderr=devnull)

def GetLabels():
  labels = RunCommand('gsutil ls gs://quickdraw_dataset/full/simplified')
  labels = labels.strip()
  out = [l.split('/')[-1].split('.')[0] for l in labels.split('\n')]
  return out


def GetExamplesForLabel(label, is_preview=True):
  # Download the NDJSON file from Google Cloud storage.
  url = '%s/%s.ndjson' % (QUICKDRAW_ROOT, label)
  # Use the Range header to request only part of the file. Then truncate the
  # last line (which is incomplete).
  headers = {}
  if is_preview:
    headers['Range'] = 'bytes=0-%s' % (PREVIEW_BYTES)

  r = requests.get(url, headers=headers)
  ndjson = r.text.split('\n')
  # Remove the last line.
  del ndjson[-1]
  print 'Found %d examples of %s.' % (len(ndjson), label)
  return '\n'.join(ndjson)

def WriteFile(path, data):
  with open(path, 'w') as f:
    f.write(data)
    print 'Wrote %s to disk.' % path


def main():
  RunCommand('mkdir -p data')
  labels = GetLabels()
  labels_path = 'public/labels.json'
  WriteFile(labels_path, json.dumps(labels))
  for label in labels:
    try:
      data = GetExamplesForLabel(label)
      data_path = 'data/%s.ndjson' % label
      WriteFile(data_path, data)
    except ValueError as e:
      print 'Error: failed to load label "%s": %s.' % (label, str(e))

  RunCommand('chmod a+x data/ && chmod a+r data/*')


if __name__ == '__main__':
  if len(sys.argv) == 2:
    label = sys.argv[1]
    print GetExamplesForLabel(label)
  else:
    main()
