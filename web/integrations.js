/* QadamX integrations: local audio only. No remote request, transcript, or signature.
 * Deployment: Permissions-Policy microphone=(self); CSP media-src 'self' blob:.
 * Future AI: server-only API key, authorized project/budget, RU/KK quality evaluation.
 * Future phone verification: authorized SMS provider, server-side OTP with expiry,
 * rate limits and attempt limits; trusted IIN-to-person/phone association separately.
 * No real IIN collection or default/test code is provided by this prototype.
 * Future MIS: clinic-approved API specification, sandbox, scopes and credentials.
 */
'use strict';

window.QadamIntegrations = (() => {
  const voice = {phase:'idle', consent:false, elapsed:0, url:'', mime:'', bytes:0, message:null};
  let recorder = null, stream = null, chunks = [], tick = null, deadline = null, started = 0, generation = 0;
  const tr = (ru, kk) => t(ru, kk);
  const time = seconds => { const total = Math.min(60, Math.max(0, Math.floor(seconds))); return String(Math.floor(total / 60)).padStart(2,'0') + ':' + String(total % 60).padStart(2,'0'); };
  const supported = () => window.isSecureContext && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  const busy = () => ['pending','recording','stopping'].includes(voice.phase);
  const status = () => {
    if (voice.message) return tr(...voice.message);
    const messages = {
      idle:['Микрофон выключен. Запись ещё не начата.','Микрофон өшірулі. Жазу әлі басталған жоқ.'],
      pending:['Разрешите доступ к микрофону в окне браузера.','Браузер терезесінде микрофонға рұқсат беріңіз.'],
      recording:['Идёт запись. Через 60 секунд она остановится автоматически.','Жазылып жатыр. 60 секундтан кейін автоматты түрде тоқтайды.'],
      stopping:['Завершаем запись…','Жазуды аяқтап жатырмыз…'],
      ready:['Аудио готово. Можно прослушать или скачать. Текст не распознавался.','Аудио дайын. Тыңдауға немесе жүктеп алуға болады. Мәтінге айналдырылған жоқ.']
    };
    return tr(...(messages[voice.phase] || messages.idle));
  };
  function stopTracks() {
    if (stream) stream.getTracks().forEach(track => track.stop());
    stream = null;
  }
  function clearTimers() { clearInterval(tick); clearTimeout(deadline); tick = null; deadline = null; }
  function revokeAudio() {
    if (voice.url) URL.revokeObjectURL(voice.url);
    voice.url = ''; voice.mime = ''; voice.bytes = 0;
  }
  function reset() {
    generation++;
    clearTimers();
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
    stopTracks(); recorder = null; chunks = []; revokeAudio();
    Object.assign(voice, {phase:'idle',consent:false,elapsed:0,message:null});
  }
  function update() {
    if (state.page !== 'integrations') return;
    const consent = document.getElementById('voice-study-consent');
    if (consent) { consent.checked = voice.consent; consent.disabled = busy(); }
    const startButton = document.getElementById('voice-start');
    if (startButton) startButton.disabled = !supported() || !voice.consent || busy();
    const stopButton = document.getElementById('voice-stop');
    if (stopButton) {
      stopButton.disabled = !['pending','recording'].includes(voice.phase);
      stopButton.textContent = voice.phase === 'pending'
        ? tr('Отменить запрос','Сұрауды болдырмау') : tr('Остановить запись','Жазуды тоқтату');
    }
    const clearButton = document.getElementById('voice-clear');
    if (clearButton) clearButton.disabled = busy() || !voice.url;
    const clock = document.getElementById('voice-timer');
    if (clock) clock.textContent = time(voice.elapsed) + ' / 01:00';
    const progress = document.getElementById('voice-progress');
    if (progress) progress.value = Math.min(60, voice.elapsed);
    const note = document.getElementById('voice-status');
    if (note) note.textContent = status();
    const preview = document.getElementById('voice-preview');
    if (preview) { preview.hidden = !voice.url; preview.style.display = voice.url ? '' : 'none'; }
    const audio = document.getElementById('voice-playback');
    if (audio && voice.url && audio.getAttribute('src') !== voice.url) audio.src = voice.url;
    if (audio && !voice.url) audio.removeAttribute('src');
    const downloadLink = document.getElementById('voice-download');
    if (downloadLink && voice.url) {
      downloadLink.href = voice.url;
      const ext = voice.mime.includes('mp4') ? 'm4a' : voice.mime.includes('ogg') ? 'ogg' : 'webm';
      downloadLink.download = 'QadamX-study-voice.' + ext;
    }
  }
  function fail(message) {
    generation++; clearTimers();
    if (recorder && recorder.state !== 'inactive') { try { recorder.stop(); } catch {} }
    stopTracks(); recorder = null; chunks = [];
    voice.phase = 'idle'; voice.message = message; update();
  }
  function stop() {
    if (voice.phase === 'pending') {
      generation++; voice.phase = 'idle';
      voice.message = ['Запрос отменён. Микрофон не записывает.','Сұрау тоқтатылды. Микрофон жазып жатқан жоқ.'];
      update(); return;
    }
    if (voice.phase !== 'recording') return;
    voice.elapsed = Math.min(60, (performance.now() - started) / 1000);
    clearTimers(); voice.phase = 'stopping'; update();
    try { recorder.stop(); } catch { fail(['Не удалось завершить запись. Попробуйте снова.','Жазуды аяқтау мүмкін болмады. Қайталап көріңіз.']); }
    stopTracks();
  }
  async function start() {
    if (state.page !== 'integrations' || busy()) return;
    if (!voice.consent) { voice.message = ['Сначала подтвердите, что запишете только вымышленный учебный пример.','Алдымен тек ойдан шығарылған оқу мысалын жазатыныңызды растаңыз.']; update(); return; }
    if (!supported()) { voice.message = ['Запись недоступна в этом браузере. Откройте сайт по HTTPS в браузере с поддержкой микрофона и MediaRecorder.','Бұл браузерде аудио жазу қолжетімсіз. Сайтты микрофон мен MediaRecorder қолдауы бар браузерде HTTPS арқылы ашыңыз.']; update(); return; }
    revokeAudio(); chunks = []; voice.elapsed = 0; voice.message = null; voice.phase = 'pending'; update();
    const token = ++generation;
    try {
      const acquired = await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if (token !== generation || state.page !== 'integrations') { acquired.getTracks().forEach(track => track.stop()); return; }
      stream = acquired;
      const mimeType = ['audio/webm;codecs=opus','audio/webm','audio/mp4','audio/ogg;codecs=opus'].find(type => MediaRecorder.isTypeSupported?.(type));
      recorder = new MediaRecorder(stream, mimeType ? {mimeType,audioBitsPerSecond:64000} : undefined);
      const currentRecorder = recorder;
      recorder.addEventListener('dataavailable', event => { if (token === generation && event.data.size) chunks.push(event.data); });
      recorder.addEventListener('error', () => { if (token === generation) fail(['Ошибка записи. Микрофон выключен. Попробуйте снова.','Жазу қатесі. Микрофон өшірілді. Қайталап көріңіз.']); });
      recorder.addEventListener('stop', () => {
        if (token !== generation) return;
        clearTimers(); stopTracks();
        voice.mime = currentRecorder.mimeType || chunks[0]?.type || 'audio/webm';
        const blob = new Blob(chunks, {type:voice.mime});
        chunks = []; recorder = null;
        if (!blob.size) { fail(['Запись получилась пустой. Проверьте микрофон и повторите.','Жазба бос болып шықты. Микрофонды тексеріп, қайталап көріңіз.']); return; }
        voice.bytes = blob.size; voice.url = URL.createObjectURL(blob); voice.phase = 'ready'; voice.message = null; update();
      });
      stream.getAudioTracks().forEach(track => track.addEventListener('ended', () => { if (token === generation && voice.phase === 'recording') stop(); }));
      recorder.start(250); started = performance.now(); voice.phase = 'recording'; update();
      tick = setInterval(() => {
        voice.elapsed = Math.min(60, (performance.now() - started) / 1000);
        const timer = document.getElementById('voice-timer'), progress = document.getElementById('voice-progress');
        if (timer) timer.textContent = time(voice.elapsed) + ' / 01:00';
        if (progress) progress.value = voice.elapsed;
        if (voice.elapsed >= 60) stop();
      },250);
      deadline = setTimeout(stop,60000);
    } catch (error) {
      if (token !== generation) return;
      const messages = {
        NotAllowedError:['Доступ к микрофону запрещён. Разрешите его в настройках сайта и повторите.','Микрофонға рұқсат берілмеген. Сайт баптауларында рұқсат беріп, қайталап көріңіз.'],
        NotFoundError:['Микрофон не найден. Подключите его и повторите.','Микрофон табылмады. Оны қосып, қайталап көріңіз.'],
        NotReadableError:['Микрофон недоступен или занят другим приложением.','Микрофон қолжетімсіз немесе оны басқа қолданба пайдаланып жатыр.'],
        SecurityError:['Браузер запретил запись на этой странице.','Браузер бұл бетте аудио жазуға тыйым салды.']
      };
      fail(messages[error.name] || ['Не удалось начать запись. Проверьте микрофон и настройки браузера.','Жазуды бастау мүмкін болмады. Микрофон мен браузер баптауларын тексеріңіз.']);
    }
  }
  function view() {
    const missing = tr('Ожидает подключения','Қосылуы қажет');
    return heading(tr('AI, голос и интеграции','AI, дауыс және интеграциялар'),tr('Работающие возможности и условия подключения внешних сервисов.','Іске қосылған мүмкіндіктер және сыртқы сервистерді қосу шарттары.')) + `
      <section class="card stack" aria-labelledby="voice-title">
        <div class="card-head"><h2 id="voice-title">${tr('Учебная запись голоса','Оқу үшін аудио жазу')}</h2><span class="badge green">${tr('Локально в браузере','Браузерде жергілікті')}</span></div>
        <p>${tr('Запишите вымышленный разговор для проверки микрофона. Это запись аудио, а не распознавание речи. AI-текст не создаётся.','Микрофонды тексеру үшін ойдан шығарылған диалог жазыңыз. Бұл — аудио жазу, сөйлеуді мәтінге айналдыру емес. AI мәтін жасамайды.')}</p>
        <p class="notice">${tr('Только учебный пример без настоящих имён и сведений о пациентах. Звук не отправляется на сервер и не сохраняется автоматически. При уходе со страницы запись удаляется из памяти.','Тек оқу мысалын қолданыңыз: нақты есімдер мен пациент деректерін айтпаңыз. Дыбыс серверге жіберілмейді және автоматты түрде сақталмайды. Бұл беттен шыққанда жазба жадтан өшіріледі.')}</p>
        ${!supported() ? `<p class="notice warm" role="status">${tr('Этот браузер не поддерживает запись микрофона на данной странице.','Бұл браузер осы бетте микрофоннан жазуды қолдамайды.')}</p>` : ''}
        <label class="check-row" for="voice-study-consent"><input id="voice-study-consent" type="checkbox" ${voice.consent?'checked':''} ${busy()?'disabled':''}>${tr('Подтверждаю: запишу только вымышленный учебный пример.','Растаймын: тек ойдан шығарылған оқу мысалын жазамын.')}</label>
        <div class="inline"><strong id="voice-timer" aria-label="${tr('Длительность записи, максимум одна минута','Жазба ұзақтығы, ең көбі бір минут')}">${time(voice.elapsed)} / 01:00</strong><progress id="voice-progress" max="60" value="${voice.elapsed}" aria-label="${tr('Продолжительность записи','Жазба ұзақтығы')}"></progress></div>
        <p id="voice-status" role="status" aria-live="polite">${status()}</p>
        <div class="actions">
          <button id="voice-start" type="button" data-voice-action="start" class="primary" ${!supported()||!voice.consent||busy()?'disabled':''}>${tr('Начать запись','Жазуды бастау')}</button>
          <button id="voice-stop" type="button" data-voice-action="stop" ${!['pending','recording'].includes(voice.phase)?'disabled':''}>${voice.phase==='pending'?tr('Отменить запрос','Сұрауды болдырмау'):tr('Остановить запись','Жазуды тоқтату')}</button>
          <button id="voice-clear" type="button" data-voice-action="clear" ${busy()||!voice.url?'disabled':''}>${tr('Удалить запись','Жазбаны өшіру')}</button>
        </div>
        <div id="voice-preview" class="stack" ${voice.url?'':'hidden style="display:none"'}>
          <label for="voice-playback">${tr('Прослушать учебную запись','Оқу жазбасын тыңдау')}</label>
          <audio id="voice-playback" controls preload="metadata" style="width:100%;max-width:100%" ${voice.url?`src="${esc(voice.url)}"`:''}></audio>
          <a id="voice-download" ${voice.url?`href="${esc(voice.url)}"`:''} download="QadamX-study-voice.${voice.mime.includes('mp4')?'m4a':voice.mime.includes('ogg')?'ogg':'webm'}">${tr('Скачать аудио','Аудионы жүктеп алу')}</a>
        </div>
      </section>
      <div class="grid-two section-gap">
        <section class="card stack"><div class="card-head"><h2>${tr('AI-черновики','AI жобалары')}</h2><span class="badge ${state.aiStatus?.available?'green':'amber'}">${t(aiConnectionLabel())}</span></div><p>${state.aiStatus?.available?tr('Сервер настроен для подготовки AI-черновиков из текстового диалога. Откройте шаблон документа и нажмите «AI-черновик по диалогу». Каждый результат проверяет врач.','Сервер мәтіндік диалогтан AI жобасын дайындауға бапталған. Құжат үлгісін ашып, «Диалог бойынша AI-жоба» түймесін басыңыз. Әр нәтижені дәрігер тексереді.'):tr('Для AI-черновиков владелец сайта должен настроить подключение к AI-сервису. Пока поля документа можно заполнить вручную.','AI жобалары үшін сайт иесі AI қызметіне қосылымды баптауы керек. Әзірге құжат өрістерін қолмен толтыруға болады.')}</p><p class="notice">${tr('Распознавание речи пока не подключено: записанное аудио не превращается в текст. Качество медицинской речи на русском и казахском ещё не оценивалось.','Сөйлеуді тану әлі қосылмаған: жазылған аудио мәтінге айналмайды. Орысша және қазақша медициналық сөйлеуді тану сапасы әлі бағаланған жоқ.')}</p></section>
        <section class="card stack"><div class="card-head"><h2>${tr('Проверка ИИН и телефона','ЖСН мен телефонды тексеру')}</h2><span class="badge amber">${missing}</span></div><p>${tr('Для отправки настоящего кода нужен SMS-провайдер и его защищённое подключение. Сейчас SMS не отправляются, готового кода для входа нет.','Нақты код жіберу үшін SMS қызметі және оған қорғалған қосылым қажет. Қазір SMS жіберілмейді, кіруге арналған дайын код жоқ.')}</p><p>${tr('Код подтверждает доступ к телефону. Принадлежность ИИН этому человеку и связь ИИН с номером проверяются отдельно через доверенный источник.','Код телефонға қолжетімділікті растайды. ЖСН-нің осы адамға тиесілі екені және телефон нөмірімен байланысы сенімді дереккөз арқылы бөлек тексеріледі.')}</p><p class="notice">${tr('Сбор настоящих ИИН пока закрыт. Для запуска нужны защищённое хранение, ограничение попыток и проверенный сервис идентификации.','Нақты ЖСН жинау әзірге жабық. Іске қосу үшін қорғалған сақтау, әрекеттер санын шектеу және тексерілген сәйкестендіру қызметі қажет.')}</p></section>
        <section class="card stack"><div class="card-head"><h2>${tr('Медицинская система клиники','Клиниканың медициналық жүйесі')}</h2><span class="badge amber">${missing}</span></div><p>${tr('Нужны выбранная клиника, название медицинской системы, разрешение на обмен и доступ к её API. Подключений к Damumed, eGov и другим системам сейчас нет.','Таңдалған клиника, медициналық жүйенің атауы, дерек алмасуға рұқсат және оның API жүйесіне қолжетімділік қажет. Қазір Damumed, eGov және басқа жүйелерге қосылмаған.')}</p><p>${tr('Внутренние заявки и документы QadamX не отправляются во внешнюю клинику.','QadamX ішіндегі өтініштер мен құжаттар сыртқы клиникаға жіберілмейді.')}</p><a href="https://hl7.org/fhir/R4/http.html" target="_blank" rel="noopener noreferrer">${tr('Стандарт обмена HL7 FHIR ↗','HL7 FHIR дерек алмасу стандарты ↗')}</a></section>
      </div>`;
  }
  document.addEventListener('change', event => {
    if (event.target.id === 'voice-study-consent' && !busy()) { voice.consent = event.target.checked; voice.message = null; update(); }
  });
  document.addEventListener('click', event => {
    const button = event.target.closest('button[data-voice-action]');
    if (!button || state.page !== 'integrations') return;
    if (button.dataset.voiceAction === 'start') start();
    if (button.dataset.voiceAction === 'stop') stop();
    if (button.dataset.voiceAction === 'clear' && !busy()) {
      revokeAudio(); voice.phase = 'idle'; voice.elapsed = 0;
      voice.message = ['Запись удалена из памяти браузера.','Жазба браузер жадынан өшірілді.']; update();
    }
  });
  const previousRender = render;
  render = function () { if (state.page !== 'integrations') reset(); previousRender(); };
  window.addEventListener('pagehide', reset);
  window.addEventListener('beforeunload', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden && voice.phase === 'recording') stop(); });
  return {view};
})();

function integrationsPage() { return window.QadamIntegrations.view(); }
