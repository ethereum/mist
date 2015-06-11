Fruits = new Mongo.Collection('fruits');

if (Meteor.isClient) {
  // counter starts at 0
  Session.setDefault('counter', 0);

  Template.hello.helpers({
    counter: function () {
      return Fruits.find().count()
    },
    fruits: function () {
      return Fruits.find();
    }
  });

  Template.hello.events({
    'click button': function () {
      var fruits = ['Apple', 'Banana', 'Cherry', 'Date', 'Fig', 'Grape'];
      var firstRandomFruit = _.shuffle(fruits)[0];
      Fruits.insert({fruit: firstRandomFruit});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    console.log('Meteor app started.');
  });
}
