import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shadow_news/widgets/news_card.dart';

void main() {
  testWidgets('NewsCard.showFullNewsModal renders full details sheet properly', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: Builder(
            builder: (context) {
              return ElevatedButton(
                onPressed: () {
                  NewsCard.showFullNewsModal(
                    context: context,
                    title: 'తిరుమల శ్రీవారి భక్తులకు అలర్ట్',
                    shortDesc: 'శ్రీవారి భక్తులకు ముఖ్య గమనిక.',
                    fullContent: 'తిరుమల శ్రీవారి దర్శనార్థం విచ్చేసే భక్తుల సౌకర్యార్థం టీటీడీ కీలక నిర్ణయం తీసుకుంది.\nసమగ్ర ఏర్పాట్లు పూర్తి అయ్యాయి.',
                    imageUrl: '',
                    locationName: 'తిరుపతి',
                    timeAgo: '10m ago',
                    reporterName: 'రిపోర్టర్',
                    categoryName: 'ఆధ్యాత్మికం',
                    shortCode: 'TRP01',
                    isDark: false,
                  );
                },
                child: const Text('Open Modal'),
              );
            },
          ),
        ),
      ),
    );

    // Tap button to open the bottom sheet modal
    await tester.tap(find.text('Open Modal'));
    await tester.pumpAndSettle();

    // Verify modal contents are rendered
    expect(find.text('తిరుమల శ్రీవారి భక్తులకు అలర్ట్'), findsOneWidget);
    expect(find.text('ఆధ్యాత్మికం'), findsOneWidget);
    expect(find.text('తిరుపతి'), findsOneWidget);
    expect(find.textContaining('పూర్తి వార్తా కథనం'), findsOneWidget);
    expect(find.text('వాట్సాప్ షేర్'), findsOneWidget);
  });
}
