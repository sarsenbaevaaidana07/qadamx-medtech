from pathlib import Path
import zipfile, csv, io, json, hashlib, collections, argparse

ROOT = Path(__file__).parent
parser = argparse.ArgumentParser(description='Import the original synthetic corpus ZIP')
parser.add_argument('archive', type=Path, help='Path to clinical_visit_note_summarization_corpus-main.zip')
ARCHIVE = parser.parse_args().archive
base = 'clinical_visit_note_summarization_corpus-main/'
specs = [
 ('ACI-BENCH','train','data/aci-bench/challenge_data/train.csv'),
 ('ACI-BENCH','validation','data/aci-bench/challenge_data/valid.csv'),
 ('ACI-BENCH','test1','data/aci-bench/challenge_data/clinicalnlp_taskB_test1.csv'),
 ('ACI-BENCH','test2','data/aci-bench/challenge_data/clinicalnlp_taskC_test2.csv'),
 ('ACI-BENCH','test3','data/aci-bench/challenge_data/clef_taskC_test3.csv'),
 ('MTS-Dialog','train','data/mts-dialog/MTS_Dataset_TrainingSet.csv'),
 ('MTS-Dialog','validation','data/mts-dialog/MTS_Dataset_ValidationSet.csv'),
 ('MTS-Dialog','test1','data/mts-dialog/MTS_Dataset_Final_200_TestSet_1.csv'),
 ('MTS-Dialog','test2','data/mts-dialog/MTS_Dataset_Final_200_TestSet_2.csv')]
all_rows=[]; summary=[]
(ROOT/'research').mkdir(exist_ok=True)
(ROOT/'web'/'attribution').mkdir(exist_ok=True)
with zipfile.ZipFile(ARCHIVE) as z:
 for dataset, split, name in specs:
  raw=z.read(base+name)
  rows=list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
  summary.append(dict(dataset=dataset,split=split,count=len(rows),file=name,sha256=hashlib.sha256(raw).hexdigest(),empty=sum(not (v or '').strip() for r in rows for v in r.values())))
  for r in rows:
   rid=r.get('encounter_id',r.get('ID'))
   all_rows.append(dict(id=f'{dataset}/{split}/{rid}',originalId=rid,dataset=dataset,split=split,source=name,dialogue=r['dialogue'],reference=r.get('note',r.get('section_text')),section=r.get('section_header','FULL NOTE'),synthetic=True,language='en'))
 for name in ['README.md','LICENSE','NOTICE']:
  (ROOT/'web'/'attribution'/name).write_bytes(z.read(base+name))
 audio=[n for n in z.namelist() if n.lower().endswith(('.wav','.mp3','.flac','.ogg','.m4a'))]
hashes=collections.defaultdict(list)
for r in all_rows:
 h=hashlib.sha256(' '.join(r['dialogue'].lower().split()).encode()).hexdigest()
 hashes[h].append(r['id'])
duplicates=[v for v in hashes.values() if len(v)>1]
train_hashes={hashlib.sha256(' '.join(r['dialogue'].lower().split()).encode()).hexdigest() for r in all_rows if r['split']=='train'}
clean=[]; excluded=[]; seen=set()
for r in all_rows:
 if r['split']=='train': continue
 h=hashlib.sha256(' '.join(r['dialogue'].lower().split()).encode()).hexdigest()
 if h in train_hashes or h in seen: excluded.append(r['id'])
 else: clean.append(r); seen.add(h)
audit=dict(archive=ARCHIVE.name,archiveSha256=hashlib.sha256(ARCHIVE.read_bytes()).hexdigest(),total=len(all_rows),uniqueIds=len(set(r['id'] for r in all_rows)),files=summary,duplicateDialogueGroups=duplicates,audioFiles=audio,provenance='Synthetic clinical encounters, per source README. English text. No QadamX patients or sales.',publicSelection='Train splits only. Validation and test held locally outside web.')
audit['evaluationExcludedIds']=excluded
audit['cleanHeldOutCount']=len(clean)
(ROOT/'research'/'audit.json').write_text(json.dumps(audit,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'research'/'evaluation-data.json').write_text(json.dumps([r for r in all_rows if r['split']!='train'],ensure_ascii=False),encoding='utf-8')
(ROOT/'research'/'evaluation-clean.json').write_text(json.dumps(clean,ensure_ascii=False),encoding='utf-8')
(ROOT/'web'/'data.js').write_text('window.QADAM_DATA = '+json.dumps([r for r in all_rows if r['split']=='train'],ensure_ascii=False)+';\nwindow.QADAM_AUDIT = '+json.dumps(audit,ensure_ascii=False)+';',encoding='utf-8')
print(json.dumps({'total':len(all_rows),'publicTrain':sum(r['split']=='train' for r in all_rows),'heldOut':sum(r['split']!='train' for r in all_rows),'duplicates':len(duplicates),'audio':len(audio)}))
