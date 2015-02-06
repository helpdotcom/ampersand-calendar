;(function() {
  var d3 = require('d3');
  var _ = require('lodash');
  var moment = require('moment');

  var AmpersandState = require('ampersand-state');
  var AmpersandView = require('ampersand-view');

  var CalendarState = AmpersandState.extend({
    props: {
      startDate: [ 'object', false, function() { return null; } ],
      endDate: [ 'object', false, function() { return null; } ]
    },
    session: {
      current: [ 'object', false, function() { return moment(); } ],
      currentDates: 'array'
    },
    initialize: function() {
      this.currentDates = this.createDateArray();

      this.on('change:startDate', function(model) {
        model.currentDates = model.createDateArray();
      });
      this.on('change:endDate', function(model) {
        model.currentDates = model.createDateArray();
      });
    },
    selectPreviousMonth: function() {
      this.current.subtract(1, 'M');
      this.currentDates = this.createDateArray();
    },
    selectNextMonth: function() {
      if (this.current.year() < moment().year() || (this.current.year() === moment().year() && this.current.month() < moment().month())) {
        this.current.add(1, 'M');
        this.currentDates = this.createDateArray();
      }
    },
    selectWeekday: function(event) {
      d3.select(event.target).each(function(d) {
        if (d.valid) {
          var date = d.date;
          var now = moment();
          if (date.isBefore(now, 'days') || date.isSame(now, 'day')) {
            if (this.startDate === null || this.endDate !== null) {
              this.startDate = date;
              this.endDate = null;
            } else {
              var diff = date.diff(this.startDate, 'days');
              if (diff === 0) {
                this.startDate = null;
              } else if (diff < 0) {
                this.endDate = this.startDate;
                this.startDate = date;
              } else {
                this.endDate = date;
              }
            }
            this.currentDates = this.createDateArray();
          }
        }
      }.bind(this));
    },
    createDateArray: function() {
      var month = moment(this.current);

      var startDayOfMonth = month.date(1).day();
      var lastDateOfMonth = month.add(1, 'M').date(0).date();

      var dates = [];
      var now = moment();
      var weekday;
      var week;
      var data;
      var selected;
      var dateMoment;
      for (var i = 0; i < startDayOfMonth + lastDateOfMonth; i ++) {
        var date = i - startDayOfMonth + 1;
        dateMoment = moment(month).date(date);
        weekday = i % 7;
        week = Math.floor(i / 7);

        selected = false;
        var valid = i >= startDayOfMonth && (dateMoment.isBefore(now, 'days') || dateMoment.isSame(now, 'day'));

        if (this.endDate !== null) {
          selected = (this.startDate !== null && !dateMoment.isBefore(this.startDate, 'days')) && !dateMoment.isAfter(this.endDate, 'days');
        } else {
          selected = (this.startDate !== null && dateMoment.isSame(this.startDate, 'days'));
        }

        data = {
          valid: valid,
          date: dateMoment,
          selected: selected,
          weekday: weekday,
          week: week
        };

        dates.push(data);
      }

      weekday ++;
      month.add(1, 'M');
      for (var j = 0; j < (7 * (6 - week)) - weekday; j ++) {
        dateMoment = moment(month).date(j + 1);
        selected = true;

        if (this.endDate !== null) {
          selected = (this.startDate !== null && !dateMoment.isBefore(this.startDate, 'days')) && !dateMoment.isAfter(this.endDate, 'days');
        } else {
          selected = (this.startDate !== null && dateMoment.isSame(this.startDate, 'days'));
        }

        data = {
          valid: false,
          date: dateMoment,
          selected: selected,
          weekday: (j + weekday) % 7,
          week: week + Math.floor((j + weekday) / 7)
        };

        dates.push(data);
      }

      return dates;
    }
  });

  var CalendarView = AmpersandView.extend({
    template: '<svg></svg>',
    autoRender: true,
    initialize: function() {
      this.model._view = this;
    },
    events: {
      'click .ampersand-calendar-month-previous': 'selectPreviousMonth',
      'click .ampersand-calendar-month-next': 'selectNextMonth',
      'click .ampersand-calendar-weekday-container': 'selectWeekday'
    },
    bindings: {
      'model.currentDates': {
        type: function() {
          this.renderCalendar();
        }
      },
    },
    render: function() {
      AmpersandView.prototype.render.call(this);

      var calendar = this.svg = d3.select(this.el)
        .attr('class', 'ampersand-calendar')
        .attr('width', '100%')
        .attr('height', '16em');

      var month = calendar.append('g')
        .attr('class', 'ampersand-calendar-month');

      var monthBackground = month.append('rect')
        .attr('class', 'ampersand-calendar-month-background')
        .attr('width', '100%')
        .attr('height', '2em')
        .attr('rx', '1em')
        .attr('ry', '1em');

      var monthLabel = month.append('text')
        .attr('class', 'ampersand-calendar-month-label')
        .attr('x', '50%')
        .attr('y', '1.75em')
        .text(this.model.current.format('MMMM YYYY'));

      var monthPrevious = month.append('svg')
        .attr('class', 'ampersand-calendar-arrow ampersand-calendar-month-previous');
      var monthPreviousGroup = monthPrevious.append('g')
        .attr('transform', 'translate(16, 10) scale(0.75, 0.75)');
      monthPreviousGroup.append('rect')
        .style('opacity', 0)
        .attr('x', '-0.5em')
        .attr('y', '-0.5em')
        .attr('width', '2em')
        .attr('height', '2em');
      monthPreviousGroup.append('line')
        .attr('x1', '0')
        .attr('y1', '0.55em')
        .attr('x2', '0.5em')
        .attr('y2', '0');
      monthPreviousGroup.append('line')
        .attr('x1', '0')
        .attr('y1', '0.45em')
        .attr('x2', '0.5em')
        .attr('y2', '1em');

      var monthNext = month.append('svg')
        .attr('x', '100%')
        .style('overflow', 'visible')
        .attr('class', 'ampersand-calendar-arrow ampersand-calendar-month-next');
      var monthNextGroup = monthNext.append('g')
        .attr('transform', 'translate(-22, 10) scale(0.75, 0.75)');
      monthNextGroup.append('rect')
        .style('opacity', 0)
        .attr('x', '-0.5em')
        .attr('y', '-0.5em')
        .attr('width', '2em')
        .attr('height', '2em');
      monthNextGroup.append('line')
        .attr('x1', '0.5em')
        .attr('y1', '0.55em')
        .attr('x2', '0')
        .attr('y2', '0');
      monthNextGroup.append('line')
        .attr('x1', '0.5em')
        .attr('y1', '0.45em')
        .attr('x2', '0')
        .attr('y2', '1em');

      var weekdays = [ 'S', 'M', 'T', 'W', 'T', 'F', 'S' ];
      var weekdayHeader = calendar.append('svg')
        .attr('class', 'ampersand-calendar-weekday-header')
        .style('overflow', 'visible')
        .attr('x', '1.5em')
        .attr('y', '3.5em');
      _.each(weekdays, function(value, index) {
        weekdayHeader.append('text')
          .attr('class', 'ampersand-calendar-weekday ampersand-calendar-weekday-header-' + index)
          .attr('x', (index / weekdays.length * 100) + '%')
          .text(value);
      });

      var weekdaysContainer = calendar.append('svg')
        .attr('class', 'ampersand-calendar-weekdays')
        .style('overflow', 'visible')
        .attr('x', '1.5em')
        .attr('y', '5.5em');

      this.renderCalendar();
    },
    renderCalendar: function() {
      if (this.svg) {
        this.svg.select('.ampersand-calendar-month-label')
          .text(this.model.current.format('MMMM YYYY'));

        var weekdaysContainer = this.svg.select('svg.ampersand-calendar-weekdays');

        var weekdayContainers = weekdaysContainer.selectAll('svg.ampersand-calendar-weekday-container')
          .data(this.model.currentDates);

        weekdayContainers.exit()
          .remove();

        var weekdayContainer = weekdayContainers.enter().append('svg')
          .attr('class', 'ampersand-calendar-weekday-container')
          .style('overflow', 'visible');

        weekdayContainer.append('circle')
          .attr('class', 'ampersand-calendar-weekday-selected')
          .attr('cy', '-0.25em')
          .attr('r', '0.75em')
          .style('opacity', 0);

        weekdayContainer.append('rect')
          .attr('class', 'ampersand-calendar-weekday-selected ampersand-calendar-weekday-selected-connector')
          .attr('y', '-1em')
          .attr('width', '14.28%')
          .attr('height', '1.5em')
          .style('display', 'none');

        weekdayContainer.append('text')
          .attr('class', 'ampersand-calendar-weekday-text');

        weekdayContainers
          .attr('x', function(d) { return (d.weekday / 7 * 100)+ '%'; })
          .attr('y', function(d) { return (d.week * 2) + 'em'; });

        weekdayContainers.select('text.ampersand-calendar-weekday-text')
          .attr('class', function(d) {
            var def = 'ampersand-calendar-weekday-text';
            return d.selected ? def + ' ampersand-calendar-weekday-text-selected' : def;
          })
          .style('opacity', function(d) { return d.valid ? 1 : 0.25; })
          .text(function(d) { return d.date.date() !== 0 ? d.date.date() : ''; });

        weekdayContainers.select('circle.ampersand-calendar-weekday-selected')
          .style('opacity', function(d) { return +d.selected; });

        weekdayContainers.select('rect.ampersand-calendar-weekday-selected')
          .style('display', function(d) { return (d.selected && this.model.endDate !== null && !this.model.endDate.isSame(d.date, 'days') && d.weekday !== 6) ? 'initial' : 'none'; }.bind(this));
      }
    },
    selectPreviousMonth: function() {
      this.model.selectPreviousMonth();
    },
    selectNextMonth: function() {
      this.model.selectNextMonth();
    },
    selectWeekday: function(event) {
      this.model.selectWeekday(event);
    }
  });

  module.exports = {
    State: CalendarState,
    View: CalendarView
  };
})();
