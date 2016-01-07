/**
 * Created by Nikolay Volf on 1/6/2016.
 */

if (Meteor.isClient) {
    Template.gitUrlSelect.events({
        'submit form': function(event) {

            event.preventDefault();

            window.ipc.send("installFromGit", { url:  event.target['git-url'].value });

        }
    });
}