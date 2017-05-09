Ext.define('Admin.view.main.MainController', {
    extend: 'Ext.app.ViewController',
    alias: 'controller.main',

    listen : {
        controller : {
            '#' : {
                unmatchedroute : 'onRouteChange'
            }
        }
    },

    routes: {
        'dashboard': {
            before  : 'checkSession',
            action  : 'onDashboardRouteChange'
        },
        'searchresults': 'onSearchResultsRouteChange',
        'profile': {
            before  : 'checkSession',
            action: 'onProfileRouteChange'
        },
        'login' : {
            before  : 'checkSession',
            action: 'onLoginChange'
        },
        'logout' : {
             before  : 'checkSession',
            action: 'onLogoutChange'
        },
        'offer-details/:id': {
             before  : 'checkSession',
            action     : 'showAppDetails',
            conditions : {
                ':id' : '([0-9]+)'
            }
        }
    },

    lastView: null,

    onLogoutConfirm : function(choice) {
         if (choice === 'yes') {
                Ext.util.Cookies.clear("userLoggedIn"); 
                Ext.util.Cookies.clear("userId"); 
                Ext.util.Cookies.clear("userName"); 
             Admin.user = null;
             Admin.userId = null;
            this.setCurrentView('login');
            
         }
    },
    onLoginChange: function() {
               
               this.setCurrentView('dashboard');
    },

    onLogoutChange: function() {
        Ext.Msg.confirm('Confirm', 'Are you sure to logout?', 'onLogoutConfirm', this); 
    },

    handleSessionCheck : function(beAdmin, args) {
        args = Ext.Array.slice(args);

        var me     = this,
            action = args[args.length - 1],
            app    = Admin.app;
        var isLoggedIn = Ext.util.Cookies.get("userLoggedIn");
        var loggedInUser = Ext.util.Cookies.get("userName");

        if (app.appready) {
            if (Admin.user || isLoggedIn == "true") {
                if (Admin.user || (loggedInUser != undefined)) {
                    action.resume();
                }
                else {
                    action.stop();
                    me.setCurrentView('login');
                }
            } else {
                action.stop();
                 me.setCurrentView('login');
            }
        } else {
            app.on(
                'appready', 
                Ext.Function.bind(me.handleSessionCheck, me, [beAdmin, args]), 
                me, 
                { single : true }
            );
        }
    },

    checkSession : function() {
        var isAdminCheck = Ext.util.Cookies.get('isAdmin');
        this.handleSessionCheck(isAdminCheck, arguments);
    },

    checkIsAdmin : function() {
        this.handleSessionCheck(true, arguments);
    },

    setCurrentView: function(hashTag) {
        hashTag = (hashTag || '').toLowerCase();

        var me = this,
            refs = me.getReferences(),
            mainCard = refs.mainCardPanel,
            mainLayout = mainCard.getLayout(),
            navigationList = refs.navigationTreeList,
            store = navigationList.getStore(),
            node = store.findNode('routeId', hashTag) ||
                   store.findNode('viewType', hashTag),
            view = (node && node.get('viewType')) || hashTag,
            lastView = me.lastView,
            existingItem = mainCard.child('component[routeId=' + hashTag + ']'),
            newView;

        // Kill any previously routed window
        if (lastView && lastView.isWindow) {
            lastView.destroy();
        }

        lastView = mainLayout.getActiveItem();

        if (!existingItem) {
            newView = Ext.create({
                xtype: view,
                routeId: hashTag,  // for existingItem search later
                hideMode: 'offsets'
            });
        }

        if (!newView || !newView.isWindow) {
            // !newView means we have an existing view, but if the newView isWindow
            // we don't add it to the card layout.
            if (existingItem) {
                // We don't have a newView, so activate the existing view.
                if (existingItem !== lastView) {
                    existingItem.destroy();
                    newView = Ext.create({
                        xtype: view,
                        routeId: hashTag,  // for existingItem search later
                        hideMode: 'offsets'
                    });
                    Ext.suspendLayouts();
                    mainLayout.setActiveItem(mainCard.add(newView));
                    Ext.resumeLayouts(true);
                }
                newView = existingItem;
            }
            else {
                // newView is set (did not exist already), so add it and make it the
                // activeItem.
                Ext.suspendLayouts();
                mainLayout.setActiveItem(mainCard.add(newView));
                Ext.resumeLayouts(true);
            }
        }

        navigationList.setSelection(node);

        if (newView.isFocusable(true)) {
            newView.focus();
        }

        me.lastView = newView;
    },

    onNavigationTreeSelectionChange: function (tree, node) {
        var to = node && (node.get('routeId') || node.get('viewType'));

        if (to) {
            this.redirectTo(to);
        }
    },

    onToggleNavigationSize: function () {
        var me = this,
            refs = me.getReferences(),
            navigationList = refs.navigationTreeList,
            wrapContainer = refs.mainContainerWrap,
            collapsing = !navigationList.getMicro(),
            new_width = collapsing ? 64 : 250;

        if (Ext.isIE9m || !Ext.os.is.Desktop) {
            Ext.suspendLayouts();

            refs.senchaLogo.setWidth(new_width);

            navigationList.setWidth(new_width);
            navigationList.setMicro(collapsing);

            Ext.resumeLayouts(); // do not flush the layout here...

            // No animation for IE9 or lower...
            wrapContainer.layout.animatePolicy = wrapContainer.layout.animate = null;
            wrapContainer.updateLayout();  // ... since this will flush them
        }
        else {
            if (!collapsing) {
                // If we are leaving micro mode (expanding), we do that first so that the
                // text of the items in the navlist will be revealed by the animation.
                navigationList.setMicro(false);
            }

            // Start this layout first since it does not require a layout
            refs.senchaLogo.animate({dynamic: true, to: {width: new_width}});

            // Directly adjust the width config and then run the main wrap container layout
            // as the root layout (it and its chidren). This will cause the adjusted size to
            // be flushed to the element and animate to that new size.
            navigationList.width = new_width;
            wrapContainer.updateLayout({isRoot: true});
            navigationList.el.addCls('nav-tree-animating');

            // We need to switch to micro mode on the navlist *after* the animation (this
            // allows the "sweep" to leave the item text in place until it is no longer
            // visible.
            if (collapsing) {
                navigationList.on({
                    afterlayoutanimation: function () {
                        navigationList.setMicro(true);
                        navigationList.el.removeCls('nav-tree-animating');
                    },
                    single: true
                });
            }
        }
    },

    onMainViewRender:function() {
        if (!window.location.hash) {
            this.redirectTo("dashboard");
        }
    },

    onRouteChange:function(id){
        this.setCurrentView(id);
    },

    onSearchRouteChange: function () {
        this.setCurrentView('searchresults');
    },

    onSwitchToModern: function () {
        Ext.Msg.confirm('Switch to Modern', 'Are you sure you want to switch toolkits?',
                        this.onSwitchToModernConfirmed, this);
    },

    onSwitchToModernConfirmed: function (choice) {
        if (choice === 'yes') {
            var s = location.search;

            // Strip "?classic" or "&classic" with optionally more "&foo" tokens
            // following and ensure we don't start with "?".
            s = s.replace(/(^\?|&)classic($|&)/, '').replace(/^\?/, '');

            // Add "?modern&" before the remaining tokens and strip & if there are
            // none.
            location.search = ('?modern&' + s).replace(/&$/, '');
        }
    },

    onSearchResultsRouteChange: function () {
        this.setCurrentView('searchresults');
    },

    onDashboardRouteChange: function () {
        this.setCurrentView('dashboard');
    },

    onProfileRouteChange: function () {
        this.setCurrentView('profile');
    },

    showAppDetails: function(id) {
        var detailModel =  Ext.create('Admin.view.ads.OfferDetail', {id: id});
        detailModel.load({
            scope: this,
            success : function(record) {
                newView = Ext.create({
                    xtype: 'offer-details',
                    hideMode: 'offsets'
                });
                newView.loadRecord(record);

                var me = this,
                    refs = me.getReferences(),
                    mainCard = refs.mainCardPanel,
                    mainLayout = mainCard.getLayout();
                Ext.suspendLayouts();
                mainLayout.setActiveItem(mainCard.add(newView));
                Ext.resumeLayouts(true);
            }
        });
    }
});
