jQuery(document).ready(function($) {

  var fields = {
    exists: {
      require: ["digital", "public", "uptodate"],
      optional: ["publisher", "officialtitle"]
    },
    digital: {
      require: ["online", "machinereadable", "bulk"]
    },
    public: {
      require: ["free"],
      expectFalse: ["online", "bulk"]
    },
    free: {
      require: ["openlicense"]
    },
    online: {
      require: ["url"]
    },
    openlicense: {
      require: ["licenseurl"]
    },
    machinereadable: {
      require: ["format"]
    },
    bulk: {
    },
    uptodate: {
    },
    publisher: {
      type: "dependant"
    },
    officialtitle: {
      type: "dependant"
    },
    format: {
      type: "dependant"
    },
    url: {
      type: "dependant"
    },
    licenseurl: {
      type: "dependant"
    }
  };

  var $yninputs = $('.yntable .js-dependent'),
      $existsInput = $('input[name="exists"]'),
      $choiceSwitches = $('.true, .false, .null'),
      $radioInputs = $('.yntable input[type="radio"]'),
      $dataInputs = $('input[type=text], input[type=url]'),
      readmoreConfig = {
        maxHeight: 58,
        embedCSS: false,
        moreLink: '<a href="#">Show more</a>',
        lessLink: '<a href="#">Hide</a>'
      };

  function getInput(question) {
    return $('.yntable input[name=' + question + ']');
  }

  function getRow(question) {
    var row = fields[question].type === "dependant" ?
          ".submission-dependant" : ".submission-row";
    return getInput(question).closest(row);
  }

  function getChildren(question, expectFalse){
    /**
     * Get all "children" questions from required & optional lists.
     * If expectFalse is truthy also include questions from expectFalse list.
     */
    var expectFalse = expectFalse || false,
        field = fields[question];
    return (field.require || []).concat(
      field.optional || [], expectFalse && field.expectFalse || []);
  }

  function iterateOverChildren(question, callback, expectFalse) {
    $.each(getChildren(question, expectFalse), function(i, child) {
      callback(child);
      iterateOverChildren(child, callback, expectFalse);
    });
  }

  function resetRecursively(question, value, resetrequired, expectFalse) {
    iterateOverChildren(question, function(child, required) {
      var $input = getInput(child);
      if ($input.is('[type=radio]')) {
        $input.filter('[value=' + value + ']').prop('checked', true);
      } else {
        $input.val('');
        if (resetrequired) {
          $input.prop('required', false);
          $input.prev('h4').removeClass('required');
        }
      }
    }, expectFalse);
  }

  function makeInputsRequired(question, value) {
    $.each(fields[question].require || [], function(i, child) {
      var $input = getInput(child);
      if (!$input.is('[type=radio]')) {
        $input.prop('required', value);
        if (value)
          $input.prev('h4').addClass('required');
        else
          $input.prev('h4').removeClass('required');
      }
    });
  }

  function getParent(question) {
    for (var name in fields) {
      if ((fields[name].require || []).indexOf(question) !== -1) {
        return name;
      }
    }
    return null;
  }

  function resolvePositiveAnswer(question) {
    resetRecursively(question, "null");
    makeInputsRequired(question, true);
    $.each(getChildren(question), function(i, child) {
      getRow(child).slideDown();
    });
    ensureZebraStripping();
  }

  function resolveNegativeAnswer(question, val) {
    var expectFalse = val === "false";
    resetRecursively(question, val, true, expectFalse);
    iterateOverChildren(question, function(child) {
      getRow(child).removeClass('shown').slideUp();
    }, expectFalse);
    ensureZebraStripping();
  }

  function maybeUnhideSomeQuestions(question) {
    // unhide previously hidden questions
    $.each(fields[question].expectFalse, function(i, child) {
      var parent = getParent(child),
          $parentInput = getInput(parent),
          parentVal = $parentInput.filter(':checked').val();
      if (parentVal == "true") {
        resolvePositiveAnswer(parent);
      }
    });
  }

  function answerChanged($input) {
    var name = $input.attr('name'),
        val = $('.yntable input[name=' + name + ']:checked').val(),
        expectFalse = val === "false";

    if (val === "true") {
      resolvePositiveAnswer(name);
    } else if (val === "false" || val === "null") {
      resolveNegativeAnswer(name, val);
    }
    if (val !== "false" && fields[name].expectFalse) {
      maybeUnhideSomeQuestions(name);
    }
  }

  $radioInputs.on('click', function() {
    answerChanged($(this));
  });

  $choiceSwitches.on('click', function() {
      answerDiff($(this));
      $('.readmore').readmore(readmoreConfig);
  });

  $dataInputs.on('keyup', function () {
    inputDiff($(this));
  });

  function ensureZebraStripping() {
    $(".submission-row:visible").removeClass('odd').each(function(i) {
      if (i % 2) {
        $(this).addClass('odd');
      }
    });
  }

  function initializeDependants($els) {
    $els.each(function(index) {
      if ($(this).hasClass('true') && $(this).is(':checked')) {
        manageDependants($(this));
      }
    });
  }

  function initializeAnswerDiff($els) {
    $els.each(function(index) {
      if ($(this).is(':checked')) {
        answerDiff($(this));
      }
    });
  }

  function initializeInputDiff($els) {
    $els.each(function(index) {
      inputDiff($(this));
    });
  }

  function answerDiff($el) {
    var $currentEntry = $el.parent().siblings('.submission-current').first(),
        currentValue = $currentEntry.text().trim(),
        diff_msg = 'The new value differs from the one currently on record.',
        diff_bg = '#EFED8A';

    if ($.inArray(currentValue, ['true', 'false', 'null']) !== -1  &&
        !$el.hasClass(currentValue) && $el.is(':checked')) {
      $el.attr('title', diff_msg).parent().attr('title', diff_msg).css({'cursor': 'pointer', 'backgroundColor': diff_bg});
      $el.parent().siblings().removeAttr('title').css('backgroundColor', '').find('input[type=radio]').removeAttr('title').css({'cursor': 'auto', 'backgroundColor': ''});

    } else {
      $el.parent().siblings().removeAttr('title').css('backgroundColor', '').find('input[type=radio]').removeAttr('title').css({'cursor': 'auto', 'backgroundColor': ''});
    }
  }

  function inputDiff($el) {
    var $currentEntry = $el.closest('.submission-dependant').find('.current-entry-value').first(),
        currentValue = $currentEntry.text().trim(),
        thisValue = $el.val().trim(),
        diff_msg = 'The new value differs from the one currently on record.',
        diff_bg = '#EFED8A';

    if (thisValue && currentValue !== $el.val().trim()) {
      $el.attr('title', diff_msg).css('backgroundColor', diff_bg);
    } else {
      $el.attr('title', '').css('backgroundColor', '');
    }
  }

  function showHideAvailabilityTable() {
    var val = $('input[name="exists"]:checked').val();
    if(val === "false" || val === "null") {
      $yninputs.find('input[value="'+ val +'"]')
        .prop('checked', true);
      $yninputs.addClass('hide').slideUp();
    } else if (val === "true") {
      $yninputs.hide().removeClass('hide').slideDown();
    } // else do nothing
  }

  var $select = $('#dataset-select');
  $select.change(function(e) {
    e.preventDefault();
    showCurrentDatasetInfo();
  });

  function showCurrentDatasetInfo() {
    var val = $select.val();
    $('.dataset-description').hide();
    $('.js-dataset-' + val).show('slow');
  }

  function enableMarkdownPreview() {

    // Adds a preview pane so the user can validate markdown in
    // the comment field before submitting
    $('#toggle-markdown-preview').click(function() {

      var user_input = $('#details').val(),
          $preview_pane = $('#markdown-preview'),
          $edit_pane = $('#details'),
          show_preview_msg = 'Show Markdown Preview',
          hide_preview_msg = 'Hide Markdown Preview';

      $preview_pane.toggle().html(marked(user_input));

      if ($preview_pane.is(':visible')) {
        $(this).html(hide_preview_msg);
        $edit_pane.attr('disabled', 'disabled');
      } else {
        $(this).html(show_preview_msg);
        $edit_pane.removeAttr('disabled', 'disabled');
      }

    });

  }

  // POSTDOWN
  (function () {
    var help = function () { return window.open("http://stackoverflow.com/editing-help", "_blank"); },
        options = {
          helpButton: { handler: help }
        };
    var mdConverter = Markdown.getSanitizingConverter();
    var mdEditor = new Markdown.Editor(mdConverter, null, options);
    mdEditor.run();
  })();

  showHideAvailabilityTable();
  ensureZebraStripping();
  showCurrentDatasetInfo();
  enableMarkdownPreview();
  initializeAnswerDiff($choiceSwitches);
  initializeInputDiff($dataInputs);
  $('.readmore').readmore(readmoreConfig);

});
