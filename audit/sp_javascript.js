

=== SCRIPT ===
function SendAjaxRequest() {
        return false;
    }

=== SCRIPT ===
new Sys.WebForms.Menu({ element: 'NavigationMenu', disappearAfter: 500, orientation: 'horizontal', tabIndex: 0, disabled: false });

=== SCRIPT ===
//<![CDATA[
Sys.Application.add_init(function() {
    $create(AjaxControlToolkit.AutoCompleteBehavior, {"completionInterval":100,"delimiterCharacters":"","enableCaching":false,"id":"MainContent_AutoCompleteExtender2","minimumPrefixLength":1,"serviceMethod":"Searchacname","servicePath":"/Sale_Purchase.aspx","useContextKey":true}, null, null, $get("MainContent_TxtAcName"));
});
Sys.Application.add_init(function() {
    $create(AjaxControlToolkit.AutoCompleteBehavior, {"completionInterval":100,"delimiterCharacters":"","enableCaching":false,"id":"MainContent_txtntnno_AutoCompleteExtender","minimumPrefixLength":1,"serviceMethod":"Searchacname","servicePath":"/Sale_Purchase.aspx","useContextKey":true}, null, null, $get("MainContent_txtntnno"));
});
Sys.Application.add_init(function() {
    $create(AjaxControlToolkit.AutoCompleteBehavior, {"completionInterval":100,"delimiterCharacters":"","enableCaching":false,"id":"MainContent_txtcnic_AutoCompleteExtender","minimumPrefixLength":1,"serviceMethod":"Searchacname","servicePath":"/Sale_Purchase.aspx","useContextKey":true}, null, null, $get("MainContent_txtcnic"));
});
Sys.Application.add_init(function() {
    $create(AjaxControlToolkit.AutoCompleteBehavior, {"completionInterval":100,"delimiterCharacters":"","enableCaching":false,"id":"MainContent_AutoCompleteExtender3","minimumPrefixLength":1,"serviceMethod":"SearchRefacname","servicePath":"/Sale_Purchase.aspx","useContextKey":true}, null, null, $get("MainContent_TxtRefaceName"));
});
Sys.Application.add_init(function() {
    $create(AjaxControlToolkit.AutoCompleteBehavior, {"completionInterval":100,"delimiterCharacters":"","enableCaching":false,"id":"MainContent_AutoCompleteExtender1","minimumPrefixLength":1,"serviceMethod":"SearchCustomers","servicePath":"/Sale_Purchase.aspx"}, null, null, $get("MainContent_TxtItemName"));
});
//]]>
